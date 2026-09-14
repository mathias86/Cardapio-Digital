-- Delivery pricing by neighborhood and safe payment method switching.

alter table public.store_settings
  add column if not exists delivery_price_per_km numeric(12,2) not null default 0
  check (delivery_price_per_km >= 0);

create table if not exists public.delivery_zones (
  id uuid primary key default extensions.gen_random_uuid(),
  neighborhood text not null check (char_length(btrim(neighborhood)) between 2 and 100),
  distance_km numeric(8,2) not null check (distance_km > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists delivery_zones_neighborhood_unique
  on public.delivery_zones (lower(btrim(neighborhood)));

drop trigger if exists delivery_zones_set_updated_at on public.delivery_zones;
create trigger delivery_zones_set_updated_at
before update on public.delivery_zones
for each row execute function private.set_updated_at();

alter table public.delivery_zones enable row level security;
grant select on public.delivery_zones to anon, authenticated;
grant insert, update, delete on public.delivery_zones to authenticated;

drop policy if exists delivery_zones_public_select on public.delivery_zones;
create policy delivery_zones_public_select on public.delivery_zones
for select to anon, authenticated
using (active or (select private.has_role(array['ADMIN'::public.user_role])));

drop policy if exists delivery_zones_admin_insert on public.delivery_zones;
create policy delivery_zones_admin_insert on public.delivery_zones
for insert to authenticated
with check ((select private.has_role(array['ADMIN'::public.user_role])));

drop policy if exists delivery_zones_admin_update on public.delivery_zones;
create policy delivery_zones_admin_update on public.delivery_zones
for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));

drop policy if exists delivery_zones_admin_delete on public.delivery_zones;
create policy delivery_zones_admin_delete on public.delivery_zones
for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create or replace function private.set_order_delivery_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.store_settings%rowtype;
  v_distance numeric(8,2);
begin
  select * into v_settings from public.store_settings where id = 1;
  if not found then
    raise exception using errcode = 'P0001', message = 'As configurações da loja não foram cadastradas.';
  end if;

  if new.delivery_type = 'PICKUP' then
    new.delivery_fee := 0;
  elsif v_settings.delivery_price_per_km > 0 then
    select distance_km into v_distance
    from public.delivery_zones
    where active and lower(btrim(neighborhood)) = lower(btrim(new.address_neighborhood));

    if not found then
      raise exception using errcode = 'P0001', message = 'Este bairro ainda não faz parte da área de entrega.';
    end if;
    new.delivery_fee := round(v_settings.delivery_price_per_km * v_distance, 2);
  else
    new.delivery_fee := v_settings.delivery_fee;
  end if;

  new.total := new.subtotal + new.delivery_fee - coalesce(new.discount_amount, 0);
  if new.payment_method = 'CASH' and new.change_for is not null and new.change_for < new.total then
    raise exception using errcode = '22023', message = 'O valor para troco deve ser maior ou igual ao total.';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_delivery_fee on public.orders;
create trigger orders_set_delivery_fee
before insert on public.orders
for each row execute function private.set_order_delivery_fee();

create or replace function public.change_pending_order_payment(
  p_order_id uuid,
  p_access_token uuid,
  p_method public.payment_method
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_method not in ('PIX', 'CARD', 'CASH') then
    raise exception using errcode = '22023', message = 'Forma de pagamento inválida.';
  end if;

  update public.orders
  set payment_method = p_method,
      payment_status = 'PENDING',
      payment_provider = case when p_method = 'CASH' then null else 'MERCADO_PAGO' end,
      payment_environment = case when p_method = 'CASH' then null else payment_environment end,
      provider_order_id = null,
      provider_payment_id = null,
      provider_status = null,
      payment_metadata = '{}'::jsonb
  where id = p_order_id
    and access_token = p_access_token
    and status = 'PENDING'
    and payment_status <> 'PAID'
    and (provider_payment_id is null or provider_status in ('rejected', 'cancelled', 'canceled'));

  if not found then
    raise exception using errcode = 'P0001', message = 'A forma de pagamento deste pedido não pode mais ser alterada.';
  end if;
end;
$$;

revoke all on function public.change_pending_order_payment(uuid,uuid,public.payment_method) from public;
grant execute on function public.change_pending_order_payment(uuid,uuid,public.payment_method) to anon, authenticated, service_role;
