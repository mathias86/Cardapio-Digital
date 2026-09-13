-- Delivery staff management, explicit assignment and promotional coupons.

alter table public.mercado_pago_settings drop constraint if exists mercado_pago_public_key_format;
alter table public.mercado_pago_settings drop constraint if exists mercado_pago_access_token_format;
alter table public.mercado_pago_settings add constraint mercado_pago_public_key_format check (public_key is null or public_key like 'APP_USR-%' or public_key like 'TEST-%');
alter table public.mercado_pago_settings add constraint mercado_pago_access_token_format check (access_token is null or access_token like 'APP_USR-%' or access_token like 'TEST-%');

create or replace function public.save_mercado_pago_settings(p_environment text,p_public_key text,p_access_token text default null,p_webhook_secret text default null,p_enabled boolean default false,p_activate boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_environment text:=upper(btrim(p_environment));
begin
  if not private.has_role(array['ADMIN'::public.user_role]) then raise exception using errcode='42501',message='Acesso permitido somente para administradores.'; end if;
  if v_environment not in ('TEST','PRODUCTION') then raise exception using errcode='22023',message='Ambiente inválido.'; end if;
  if nullif(btrim(p_public_key),'') is null or not (p_public_key like 'APP_USR-%' or p_public_key like 'TEST-%') then raise exception using errcode='22023',message='Public Key inválida.'; end if;
  if nullif(btrim(p_access_token),'') is not null and not (p_access_token like 'APP_USR-%' or p_access_token like 'TEST-%') then raise exception using errcode='22023',message='Access Token inválido.'; end if;
  update public.mercado_pago_settings set public_key=btrim(p_public_key),access_token=coalesce(nullif(btrim(p_access_token),''),access_token),webhook_secret=coalesce(nullif(btrim(p_webhook_secret),''),webhook_secret),enabled=p_enabled,updated_at=now(),updated_by=auth.uid() where environment=v_environment;
  if p_activate then
    if not exists(select 1 from public.mercado_pago_settings where environment=v_environment and public_key is not null and access_token is not null and webhook_secret is not null) then raise exception using errcode='22023',message='Cadastre Public Key, Access Token e assinatura do webhook antes de ativar.'; end if;
    update public.store_settings set mercado_pago_environment=v_environment where id=1;
  end if;
end; $$;

alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  v_name := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Cliente');
  if char_length(v_name) < 2 then v_name := 'Cliente'; end if;
  insert into public.profiles (id,name,email,phone,role) values (new.id,v_name,new.email,new.phone,'CUSTOMER');
  return new;
end; $$;

create table if not exists public.coupons (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null check (char_length(btrim(code)) between 2 and 30),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  description text,
  discount_type text not null check (discount_type in ('PERCENTAGE','FIXED')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order_value numeric(12,2) not null default 0 check (minimum_order_value >= 0),
  maximum_discount numeric(12,2) check (maximum_discount is null or maximum_discount > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_dates_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index if not exists coupons_code_unique on public.coupons (upper(btrim(code)));
create index if not exists coupons_active_dates_idx on public.coupons (active,starts_at,ends_at);
drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at before update on public.coupons for each row execute function private.set_updated_at();

alter table public.orders add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_amount numeric(12,2) not null default 0;
alter table public.orders drop constraint if exists orders_total_check;
alter table public.orders add constraint orders_discount_check check (discount_amount >= 0 and discount_amount <= subtotal);
alter table public.orders add constraint orders_total_check check (total >= 0 and total = subtotal + delivery_fee - discount_amount);

create or replace function private.calculate_coupon_discount(p_coupon public.coupons, p_subtotal numeric)
returns numeric language sql immutable set search_path = '' as $$
  select least(
    p_subtotal,
    case when p_coupon.discount_type='PERCENTAGE'
      then least(round(p_subtotal*p_coupon.discount_value/100,2),coalesce(p_coupon.maximum_discount,p_subtotal))
      else p_coupon.discount_value end
  );
$$;

create or replace function private.apply_order_coupon()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_code text := nullif(upper(btrim(current_setting('app.coupon_code',true))), ''); v_coupon public.coupons%rowtype;
begin
  new.discount_amount := 0; new.coupon_id := null; new.coupon_code := null;
  if v_code is null then return new; end if;
  select * into v_coupon from public.coupons c where upper(btrim(c.code))=v_code for update;
  if not found or not v_coupon.active then raise exception using errcode='P0001',message='Cupom inválido ou inativo.'; end if;
  if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception using errcode='P0001',message='Este cupom ainda não está disponível.'; end if;
  if v_coupon.ends_at is not null and now()>v_coupon.ends_at then raise exception using errcode='P0001',message='Este cupom expirou.'; end if;
  if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception using errcode='P0001',message='Este cupom atingiu o limite de utilizações.'; end if;
  if new.subtotal<v_coupon.minimum_order_value then raise exception using errcode='P0001',message=format('Este cupom exige pedido mínimo de R$ %s.',to_char(v_coupon.minimum_order_value,'FM999999990D00')); end if;
  new.coupon_id:=v_coupon.id; new.coupon_code:=upper(btrim(v_coupon.code)); new.discount_amount:=private.calculate_coupon_discount(v_coupon,new.subtotal);
  new.total:=new.subtotal+new.delivery_fee-new.discount_amount;
  update public.coupons set usage_count=usage_count+1 where id=v_coupon.id;
  return new;
end; $$;
drop trigger if exists orders_apply_coupon on public.orders;
create trigger orders_apply_coupon before insert on public.orders for each row execute function private.apply_order_coupon();

create or replace function public.create_order(payload jsonb)
returns table (order_id uuid,order_number bigint,access_token uuid,subtotal numeric,delivery_fee numeric,total numeric)
language plpgsql security invoker set search_path='' as $$
begin
  perform set_config('app.coupon_code',coalesce(payload->>'coupon_code',''),true);
  return query select * from private.create_order_impl(payload);
end; $$;

create or replace function public.validate_coupon(p_code text,p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_coupon public.coupons%rowtype; v_code text:=nullif(upper(btrim(p_code)),'');
begin
  if v_code is null or p_subtotal is null or p_subtotal<0 then raise exception using errcode='22023',message='Informe um cupom válido.'; end if;
  select * into v_coupon from public.coupons c where upper(btrim(c.code))=v_code;
  if not found or not v_coupon.active then raise exception using errcode='P0001',message='Cupom inválido ou inativo.'; end if;
  if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception using errcode='P0001',message='Este cupom ainda não está disponível.'; end if;
  if v_coupon.ends_at is not null and now()>v_coupon.ends_at then raise exception using errcode='P0001',message='Este cupom expirou.'; end if;
  if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception using errcode='P0001',message='Este cupom atingiu o limite de utilizações.'; end if;
  if p_subtotal<v_coupon.minimum_order_value then raise exception using errcode='P0001',message=format('Este cupom exige pedido mínimo de R$ %s.',to_char(v_coupon.minimum_order_value,'FM999999990D00')); end if;
  return jsonb_build_object('code',upper(btrim(v_coupon.code)),'name',v_coupon.name,'description',v_coupon.description,'discount_amount',private.calculate_coupon_discount(v_coupon,p_subtotal));
end; $$;

create or replace function public.assign_delivery_order(p_order_id uuid,p_delivery_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.has_role(array['ADMIN'::public.user_role]) then raise exception using errcode='42501',message='Apenas administradores podem atribuir entregas.'; end if;
  if not exists(select 1 from public.profiles where id=p_delivery_id and role='DELIVERY' and active) then raise exception using errcode='22023',message='Selecione um motoboy ativo.'; end if;
  update public.orders set delivery_assigned_to=p_delivery_id,delivery_assigned_at=now()
  where id=p_order_id and delivery_type='DELIVERY' and status not in ('DELIVERED','CANCELED');
  if not found then raise exception using errcode='P0002',message='Pedido indisponível para atribuição.'; end if;
end; $$;

create or replace function private.update_order_status_impl(p_order_id uuid,p_status public.order_status)
returns public.orders language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype; v_result public.orders%rowtype; v_role public.user_role;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='Autenticação obrigatória.'; end if;
  if p_status is null then raise exception using errcode='22023',message='O novo status é obrigatório.'; end if;
  v_role:=private.current_user_role();
  if v_role is null or v_role='CUSTOMER' then raise exception using errcode='42501',message='Usuário sem permissão para atualizar pedidos.'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0002',message='Pedido não encontrado.'; end if;
  if v_order.status=p_status then raise exception using errcode='22023',message='O pedido já está neste status.'; end if;
  if v_role='KITCHEN' and not ((v_order.status in ('PENDING','CONFIRMED') and p_status='PREPARING') or (v_order.status='PREPARING' and p_status='READY')) then
    raise exception using errcode='42501',message='Transição não permitida para a cozinha.';
  elsif v_role='DELIVERY' and not (v_order.delivery_type='DELIVERY' and v_order.delivery_assigned_to=auth.uid() and ((v_order.status='READY' and p_status='OUT_FOR_DELIVERY') or (v_order.status='OUT_FOR_DELIVERY' and p_status='DELIVERED'))) then
    raise exception using errcode='42501',message='Esta entrega não está atribuída a este motoboy.';
  end if;
  update public.orders set status=p_status where id=p_order_id returning * into v_result;
  return v_result;
end; $$;

create or replace function private.get_order_by_access_token_impl(p_access_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',o.id,'order_number',o.order_number,'status',o.status,'delivery_type',o.delivery_type,
    'payment_method',o.payment_method,'payment_status',o.payment_status,'customer_name',o.customer_name,
    'subtotal',o.subtotal,'delivery_fee',o.delivery_fee,'discount_amount',o.discount_amount,'coupon_code',o.coupon_code,'total',o.total,
    'accepted_at',o.accepted_at,'preparing_at',o.preparing_at,'ready_at',o.ready_at,
    'out_for_delivery_at',o.out_for_delivery_at,'delivered_at',o.delivered_at,'canceled_at',o.canceled_at,
    'created_at',o.created_at,'updated_at',o.updated_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'product_id',i.product_id,'product_name',i.product_name,'quantity',i.quantity,
      'unit_price',i.unit_price,'total_price',i.total_price,'notes',i.notes,
      'addons',private.order_item_addons_json(i.id)
    ) order by i.created_at,i.id) from public.order_items i where i.order_id=o.id),'[]'::jsonb)
  ) from public.orders o where o.access_token=p_access_token;
$$;

drop policy if exists orders_select_delivery on public.orders;
create policy orders_select_delivery on public.orders for select to authenticated
using ((select private.has_role(array['DELIVERY'::public.user_role])) and delivery_type='DELIVERY' and delivery_assigned_to=(select auth.uid()));

drop policy if exists order_items_select_internal on public.order_items;
create policy order_items_select_internal on public.order_items for select to authenticated using (
  (select private.has_role(array['ADMIN'::public.user_role,'KITCHEN'::public.user_role]))
  or ((select private.has_role(array['DELIVERY'::public.user_role])) and exists(select 1 from public.orders o where o.id=order_id and o.delivery_assigned_to=(select auth.uid())))
);
drop policy if exists order_item_addons_select_internal on public.order_item_addons;
create policy order_item_addons_select_internal on public.order_item_addons for select to authenticated using (
  (select private.has_role(array['ADMIN'::public.user_role,'KITCHEN'::public.user_role]))
  or ((select private.has_role(array['DELIVERY'::public.user_role])) and exists(select 1 from public.order_items i join public.orders o on o.id=i.order_id where i.id=order_item_id and o.delivery_assigned_to=(select auth.uid())))
);

create or replace function private.get_delivery_print_data_impl(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_data jsonb;
begin
  if not private.has_role(array['ADMIN'::public.user_role,'DELIVERY'::public.user_role]) then raise exception using errcode='42501',message='Sem permissão para imprimir a comanda de entrega.'; end if;
  select jsonb_build_object(
    'order_id',o.id,'order_number',o.order_number,'status',o.status,'customer_name',o.customer_name,'customer_phone',o.customer_phone,
    'address_street',o.address_street,'address_number',o.address_number,'address_neighborhood',o.address_neighborhood,'address_complement',o.address_complement,'address_reference',o.address_reference,
    'payment_method',o.payment_method,'payment_status',o.payment_status,'change_for',o.change_for,'subtotal',o.subtotal,'delivery_fee',o.delivery_fee,'total',o.total,'notes',o.notes,'created_at',o.created_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object('quantity',i.quantity,'product_name',i.product_name,'unit_price',i.unit_price,'total_price',i.total_price,'notes',i.notes,'addons',private.order_item_addons_json(i.id)) order by i.created_at,i.id) from public.order_items i where i.order_id=o.id),'[]'::jsonb)
  ) into v_data from public.orders o where o.id=p_order_id and (private.has_role(array['ADMIN'::public.user_role]) or o.delivery_assigned_to=auth.uid());
  if v_data is null then raise exception using errcode='P0002',message='Pedido não encontrado.'; end if;
  insert into public.order_print_logs(order_id,print_area,printed_by) values(p_order_id,'DELIVERY',auth.uid());
  return v_data;
end; $$;

alter table public.coupons enable row level security;
grant select,insert,update,delete on public.coupons to authenticated;
create policy coupons_admin_all on public.coupons for all to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role]))) with check ((select private.has_role(array['ADMIN'::public.user_role])));

revoke all on function public.validate_coupon(text,numeric) from public;
grant execute on function public.validate_coupon(text,numeric) to anon,authenticated,service_role;
revoke all on function public.assign_delivery_order(uuid,uuid) from public;
grant execute on function public.assign_delivery_order(uuid,uuid) to authenticated,service_role;
grant select on public.profiles to authenticated;
