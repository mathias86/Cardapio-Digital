-- Product add-ons and Mercado Pago payment metadata.

create table public.addon_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  description text,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer not null default 1 check (max_selections > 0 and max_selections >= min_selections),
  active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addons (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.addon_groups(id) on update cascade on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  description text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, name)
);

create table public.product_addon_groups (
  product_id uuid not null references public.products(id) on update cascade on delete cascade,
  addon_group_id uuid not null references public.addon_groups(id) on update cascade on delete cascade,
  display_order integer not null default 0 check (display_order >= 0),
  primary key (product_id, addon_group_id)
);

create table public.order_item_addons (
  id uuid primary key default extensions.gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  addon_id uuid references public.addons(id) on delete set null,
  addon_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create index addons_group_order_idx on public.addons (group_id, active, display_order, name);
create index product_addon_groups_product_idx on public.product_addon_groups (product_id, display_order);
create index order_item_addons_item_idx on public.order_item_addons (order_item_id);

alter table public.orders
  add column payment_provider text,
  add column provider_order_id text,
  add column provider_payment_id text,
  add column provider_status text,
  add column payment_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payment_metadata) = 'object');

create unique index orders_provider_order_unique on public.orders (provider_order_id)
  where provider_order_id is not null;

create trigger addon_groups_set_updated_at
before update on public.addon_groups
for each row execute function private.set_updated_at();

create trigger addons_set_updated_at
before update on public.addons
for each row execute function private.set_updated_at();

alter table public.addon_groups enable row level security;
alter table public.addons enable row level security;
alter table public.product_addon_groups enable row level security;
alter table public.order_item_addons enable row level security;

-- The public select policies may be combined by Postgres; for anonymous users this
-- helper is safe and always resolves to false because auth.uid() is null.
grant execute on function private.has_role(public.user_role[]) to anon;

grant select on table public.addon_groups, public.addons, public.product_addon_groups to anon, authenticated;
grant insert, update, delete on table public.addon_groups, public.addons, public.product_addon_groups to authenticated;
grant select on table public.order_item_addons to authenticated;

create policy addon_groups_select_public on public.addon_groups for select to anon, authenticated
using (active);
create policy addon_groups_select_admin on public.addon_groups for select to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));
create policy addon_groups_insert_admin on public.addon_groups for insert to authenticated
with check ((select private.has_role(array['ADMIN'::public.user_role])));
create policy addon_groups_update_admin on public.addon_groups for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));
create policy addon_groups_delete_admin on public.addon_groups for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy addons_select_public on public.addons for select to anon, authenticated
using (active);
create policy addons_select_admin on public.addons for select to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));
create policy addons_insert_admin on public.addons for insert to authenticated
with check ((select private.has_role(array['ADMIN'::public.user_role])));
create policy addons_update_admin on public.addons for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));
create policy addons_delete_admin on public.addons for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy product_addon_groups_select_public on public.product_addon_groups for select to anon, authenticated
using (true);
create policy product_addon_groups_insert_admin on public.product_addon_groups for insert to authenticated
with check ((select private.has_role(array['ADMIN'::public.user_role])));
create policy product_addon_groups_update_admin on public.product_addon_groups for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));
create policy product_addon_groups_delete_admin on public.product_addon_groups for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy order_item_addons_select_internal on public.order_item_addons for select to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role, 'KITCHEN'::public.user_role, 'DELIVERY'::public.user_role])));

create or replace function private.create_order_impl(payload jsonb)
returns table (order_id uuid, order_number bigint, access_token uuid, subtotal numeric, delivery_fee numeric, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_settings public.store_settings%rowtype;
  v_order public.orders%rowtype;
  v_order_item_id uuid;
  v_product_id uuid;
  v_quantity integer;
  v_addon_id uuid;
  v_addon public.addons%rowtype;
  v_group public.addon_groups%rowtype;
  v_addon_ids uuid[];
  v_selected_count integer;
  v_item_addon_total numeric(12, 2);
  v_name text := nullif(btrim(payload ->> 'customer_name'), '');
  v_phone text := nullif(btrim(payload ->> 'customer_phone'), '');
  v_email text := nullif(lower(btrim(payload ->> 'customer_email')), '');
  v_delivery_type public.delivery_type;
  v_payment_method public.payment_method;
  v_subtotal numeric(12, 2) := 0;
  v_delivery_fee numeric(12, 2) := 0;
  v_change_for numeric(12, 2);
  v_street text;
  v_number text;
  v_neighborhood text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Payload do pedido inválido.';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Informe um nome válido.';
  end if;
  if v_phone is null or char_length(v_phone) not between 8 and 25 or v_phone !~ '^[0-9+() .-]+$' then
    raise exception using errcode = '22023', message = 'Informe um telefone válido.';
  end if;
  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception using errcode = '22023', message = 'Informe um e-mail válido.';
  end if;
  if upper(coalesce(payload ->> 'delivery_type', '')) not in ('DELIVERY', 'PICKUP') then
    raise exception using errcode = '22023', message = 'Tipo de entrega inválido.';
  end if;
  v_delivery_type := upper(payload ->> 'delivery_type')::public.delivery_type;
  if upper(coalesce(payload ->> 'payment_method', '')) not in ('PIX', 'CARD', 'CASH') then
    raise exception using errcode = '22023', message = 'Forma de pagamento inválida.';
  end if;
  v_payment_method := upper(payload ->> 'payment_method')::public.payment_method;
  if jsonb_typeof(payload -> 'items') <> 'array' or jsonb_array_length(payload -> 'items') = 0 or jsonb_array_length(payload -> 'items') > 100 then
    raise exception using errcode = '22023', message = 'O pedido deve conter entre 1 e 100 itens.';
  end if;

  select s.* into v_settings from public.store_settings s where s.id = 1;
  if not found then raise exception using errcode = 'P0001', message = 'As configurações da loja não foram cadastradas.'; end if;
  if not v_settings.is_open then raise exception using errcode = 'P0001', message = 'A loja está fechada no momento.'; end if;

  v_street := nullif(btrim(coalesce(payload #>> '{address,street}', payload ->> 'address_street')), '');
  v_number := nullif(btrim(coalesce(payload #>> '{address,number}', payload ->> 'address_number')), '');
  v_neighborhood := nullif(btrim(coalesce(payload #>> '{address,neighborhood}', payload ->> 'address_neighborhood')), '');
  if v_delivery_type = 'DELIVERY' and (v_street is null or v_number is null or v_neighborhood is null) then
    raise exception using errcode = '22023', message = 'Informe rua, número e bairro para entrega.';
  end if;

  for v_item in select value from jsonb_array_elements(payload -> 'items') loop
    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
      if v_item ? 'addon_ids' and jsonb_typeof(v_item -> 'addon_ids') <> 'array' then raise invalid_parameter_value; end if;
      select coalesce(array_agg(value::text::uuid), array[]::uuid[]) into v_addon_ids
      from jsonb_array_elements_text(coalesce(v_item -> 'addon_ids', '[]'::jsonb));
    exception when others then
      raise exception using errcode = '22023', message = 'Produto, quantidade ou adicional inválido.';
    end;
    if v_quantity is null or v_quantity <= 0 or v_quantity > 100 then
      raise exception using errcode = '22023', message = 'A quantidade de cada item deve estar entre 1 e 100.';
    end if;
    if cardinality(v_addon_ids) <> (select count(distinct x) from unnest(v_addon_ids) x) then
      raise exception using errcode = '22023', message = 'Um adicional foi selecionado mais de uma vez.';
    end if;

    select p.* into v_product from public.products p join public.categories c on c.id = p.category_id
    where p.id = v_product_id and p.active and c.active for update of p;
    if not found then raise exception using errcode = 'P0001', message = 'Um dos produtos não está disponível.'; end if;
    if v_product.stock_quantity is not null and v_product.stock_quantity < v_quantity then
      raise exception using errcode = 'P0001', message = format('Estoque insuficiente para %s.', v_product.name);
    end if;

    if cardinality(v_addon_ids) <> (select count(*) from public.addons a join public.addon_groups g on g.id = a.group_id
      join public.product_addon_groups pg on pg.addon_group_id = g.id
      where pg.product_id = v_product.id and a.id = any(v_addon_ids) and a.active and g.active) then
      raise exception using errcode = 'P0001', message = format('Um adicional de %s não está disponível.', v_product.name);
    end if;

    for v_group in select g.* from public.addon_groups g join public.product_addon_groups pg on pg.addon_group_id = g.id
      where pg.product_id = v_product.id and g.active
    loop
      select count(*) into v_selected_count from public.addons a where a.group_id = v_group.id and a.active and a.id = any(v_addon_ids);
      if v_selected_count < v_group.min_selections or v_selected_count > v_group.max_selections then
        raise exception using errcode = 'P0001', message = format('%s exige entre %s e %s opção(ões).', v_group.name, v_group.min_selections, v_group.max_selections);
      end if;
    end loop;

    select coalesce(sum(a.price), 0) into v_item_addon_total from public.addons a where a.id = any(v_addon_ids);
    v_subtotal := v_subtotal + ((v_product.price + v_item_addon_total) * v_quantity);
    if v_product.stock_quantity is not null then update public.products set stock_quantity = stock_quantity - v_quantity where id = v_product.id; end if;
  end loop;

  if v_subtotal < v_settings.minimum_order_value then
    raise exception using errcode = 'P0001', message = format('O pedido mínimo é R$ %s.', to_char(v_settings.minimum_order_value, 'FM999999990D00'));
  end if;
  if v_delivery_type = 'DELIVERY' then v_delivery_fee := v_settings.delivery_fee; end if;
  if v_payment_method = 'CASH' and nullif(btrim(payload ->> 'change_for'), '') is not null then
    begin v_change_for := (payload ->> 'change_for')::numeric(12, 2);
    exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode = '22023', message = 'Valor de troco inválido.'; end;
    if v_change_for < v_subtotal + v_delivery_fee then raise exception using errcode = '22023', message = 'O valor para troco deve ser maior ou igual ao total.'; end if;
  end if;

  insert into public.orders (delivery_type,payment_method,customer_name,customer_phone,customer_email,address_street,address_number,address_neighborhood,address_complement,address_reference,notes,subtotal,delivery_fee,total,change_for)
  values (v_delivery_type,v_payment_method,v_name,v_phone,v_email,
    case when v_delivery_type='DELIVERY' then v_street end, case when v_delivery_type='DELIVERY' then v_number end,
    case when v_delivery_type='DELIVERY' then v_neighborhood end,
    case when v_delivery_type='DELIVERY' then nullif(btrim(coalesce(payload #>> '{address,complement}', payload ->> 'address_complement')), '') end,
    case when v_delivery_type='DELIVERY' then nullif(btrim(coalesce(payload #>> '{address,reference}', payload ->> 'address_reference')), '') end,
    nullif(btrim(payload ->> 'notes'), ''),v_subtotal,v_delivery_fee,v_subtotal+v_delivery_fee,v_change_for)
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(payload -> 'items') loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    select coalesce(array_agg(value::text::uuid), array[]::uuid[]) into v_addon_ids
    from jsonb_array_elements_text(coalesce(v_item -> 'addon_ids', '[]'::jsonb));
    select p.* into strict v_product from public.products p where p.id = v_product_id;
    select coalesce(sum(a.price), 0) into v_item_addon_total from public.addons a where a.id = any(v_addon_ids);
    insert into public.order_items (order_id,product_id,product_name,quantity,unit_price,total_price,notes)
    values (v_order.id,v_product.id,v_product.name,v_quantity,v_product.price+v_item_addon_total,(v_product.price+v_item_addon_total)*v_quantity,nullif(btrim(v_item ->> 'notes'), ''))
    returning id into v_order_item_id;
    foreach v_addon_id in array v_addon_ids loop
      select a.* into strict v_addon from public.addons a where a.id = v_addon_id;
      insert into public.order_item_addons (order_item_id,addon_id,addon_name,unit_price,total_price)
      values (v_order_item_id,v_addon.id,v_addon.name,v_addon.price,v_addon.price*v_quantity);
    end loop;
  end loop;

  insert into public.order_status_history (order_id,old_status,new_status,changed_by) values (v_order.id,null,'PENDING',auth.uid());
  return query select v_order.id,v_order.order_number,v_order.access_token,v_order.subtotal,v_order.delivery_fee,v_order.total;
end;
$$;

-- Seed sensible groups; admins can edit and link them to products from the dashboard.
insert into public.addon_groups (name, description, min_selections, max_selections, display_order)
values
  ('Molhos', 'Molhos vendidos separadamente para o lanche.', 0, 4, 10),
  ('Extras', 'Ingredientes extras para personalizar o lanche.', 0, 5, 20),
  ('Acompanhamentos', 'Itens adicionais para completar o pedido.', 0, 3, 30)
on conflict do nothing;

insert into public.addons (group_id, name, price, display_order)
select g.id, v.name, v.price, v.display_order
from public.addon_groups g
join (values
  ('Molhos','Maionese verde',2.00,10), ('Molhos','Barbecue',2.00,20), ('Molhos','Cheddar cremoso',3.00,30),
  ('Extras','Queijo',3.00,10), ('Extras','Bacon',4.00,20), ('Extras','Ovo',2.50,30),
  ('Acompanhamentos','Batata frita pequena',8.00,10), ('Acompanhamentos','Onion rings',10.00,20)
) as v(group_name,name,price,display_order) on v.group_name = g.name
on conflict (group_id, name) do nothing;

-- Existing sandwich products receive the starter groups automatically.
insert into public.product_addon_groups (product_id, addon_group_id, display_order)
select p.id, g.id, g.display_order
from public.products p
join public.categories c on c.id = p.category_id
cross join public.addon_groups g
where (lower(c.name) ~ '(lanche|hamb|burger|sandu)' or lower(p.name) ~ '(lanche|hamb|burger|sandu)')
  and g.name in ('Molhos', 'Extras', 'Acompanhamentos')
on conflict do nothing;

create or replace function private.get_order_by_access_token_impl(p_access_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'status', o.status,
    'delivery_type', o.delivery_type, 'payment_method', o.payment_method,
    'payment_status', o.payment_status, 'customer_name', o.customer_name,
    'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee, 'total', o.total,
    'accepted_at', o.accepted_at, 'preparing_at', o.preparing_at, 'ready_at', o.ready_at,
    'out_for_delivery_at', o.out_for_delivery_at, 'delivered_at', o.delivered_at,
    'canceled_at', o.canceled_at, 'created_at', o.created_at, 'updated_at', o.updated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'product_id', i.product_id, 'product_name', i.product_name,
        'quantity', i.quantity, 'unit_price', i.unit_price, 'total_price', i.total_price,
        'notes', i.notes,
        'addons', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'addon_name', a.addon_name, 'unit_price', a.unit_price, 'total_price', a.total_price) order by a.created_at, a.id) from public.order_item_addons a where a.order_item_id = i.id), '[]'::jsonb)
      ) order by i.created_at, i.id) from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o where o.access_token = p_access_token;
$$;

create or replace function private.order_item_addons_json(p_order_item_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'addon_name', a.addon_name, 'unit_price', a.unit_price, 'total_price', a.total_price) order by a.created_at, a.id), '[]'::jsonb)
  from public.order_item_addons a where a.order_item_id = p_order_item_id;
$$;

create or replace function private.get_kitchen_print_data_impl(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_data jsonb;
begin
  if not private.has_role(array['ADMIN'::public.user_role, 'KITCHEN'::public.user_role]) then
    raise exception using errcode = '42501', message = 'Sem permissão para imprimir a comanda da cozinha.';
  end if;
  select jsonb_build_object(
    'order_id',o.id,'order_number',o.order_number,'delivery_type',o.delivery_type,'status',o.status,
    'customer_name',o.customer_name,'notes',o.notes,'created_at',o.created_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object('quantity',i.quantity,'product_name',i.product_name,'notes',i.notes,'addons',private.order_item_addons_json(i.id)) order by i.created_at,i.id) from public.order_items i where i.order_id=o.id),'[]'::jsonb)
  ) into v_data from public.orders o where o.id=p_order_id and (private.has_role(array['ADMIN'::public.user_role]) or o.status in ('PENDING','CONFIRMED','PREPARING','READY'));
  if v_data is null then raise exception using errcode = 'P0002', message = 'Pedido não encontrado.'; end if;
  insert into public.order_print_logs(order_id,print_area,printed_by) values(p_order_id,'KITCHEN',auth.uid());
  return v_data;
end; $$;

create or replace function private.get_delivery_print_data_impl(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_data jsonb;
begin
  if not private.has_role(array['ADMIN'::public.user_role, 'DELIVERY'::public.user_role]) then
    raise exception using errcode = '42501', message = 'Sem permissão para imprimir a comanda de entrega.';
  end if;
  select jsonb_build_object(
    'order_id',o.id,'order_number',o.order_number,'status',o.status,'customer_name',o.customer_name,'customer_phone',o.customer_phone,
    'address_street',o.address_street,'address_number',o.address_number,'address_neighborhood',o.address_neighborhood,'address_complement',o.address_complement,'address_reference',o.address_reference,
    'payment_method',o.payment_method,'payment_status',o.payment_status,'change_for',o.change_for,'subtotal',o.subtotal,'delivery_fee',o.delivery_fee,'total',o.total,'notes',o.notes,'created_at',o.created_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object('quantity',i.quantity,'product_name',i.product_name,'unit_price',i.unit_price,'total_price',i.total_price,'notes',i.notes,'addons',private.order_item_addons_json(i.id)) order by i.created_at,i.id) from public.order_items i where i.order_id=o.id),'[]'::jsonb)
  ) into v_data from public.orders o where o.id=p_order_id and (private.has_role(array['ADMIN'::public.user_role]) or (o.delivery_type='DELIVERY' and (o.status in ('READY','OUT_FOR_DELIVERY','DELIVERED') or o.delivery_assigned_to=auth.uid())));
  if v_data is null then raise exception using errcode = 'P0002', message = 'Pedido não encontrado.'; end if;
  insert into public.order_print_logs(order_id,print_area,printed_by) values(p_order_id,'DELIVERY',auth.uid());
  return v_data;
end; $$;

revoke all on function private.order_item_addons_json(uuid) from public;
grant execute on function private.order_item_addons_json(uuid) to authenticated, service_role;
