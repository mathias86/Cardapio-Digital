begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;

revoke create on schema public from public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

create type public.user_role as enum ('ADMIN', 'KITCHEN', 'DELIVERY', 'CUSTOMER');
create type public.delivery_type as enum ('DELIVERY', 'PICKUP');
create type public.payment_method as enum ('PIX', 'CARD', 'CASH');
create type public.payment_status as enum ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
create type public.order_status as enum (
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED'
);
create type public.print_area as enum ('KITCHEN', 'DELIVERY');

create sequence public.order_number_seq as bigint start with 1001 increment by 1 no cycle;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  phone text,
  role public.user_role not null default 'CUSTOMER',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  description text,
  active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_name_lower_unique on public.categories (lower(name));
create index categories_public_order_idx on public.categories (active, display_order, name);

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  category_id uuid not null references public.categories(id) on update cascade on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 140),
  description text,
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  active boolean not null default true,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  low_stock_threshold integer check (low_stock_threshold is null or low_stock_threshold >= 0),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);
create index products_public_order_idx on public.products (active, category_id, display_order, name);
create index products_low_stock_idx on public.products (stock_quantity, low_stock_threshold)
  where stock_quantity is not null;

create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  logo_url text,
  is_open boolean not null default true,
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  minimum_order_value numeric(12, 2) not null default 0 check (minimum_order_value >= 0),
  opening_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_hours) = 'object'),
  phone text,
  whatsapp text,
  address text,
  pix_key text,
  pix_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  order_number bigint not null default nextval('public.order_number_seq'::regclass),
  access_token uuid not null default extensions.gen_random_uuid(),
  status public.order_status not null default 'PENDING',
  delivery_type public.delivery_type not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'PENDING',
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_phone text not null check (char_length(btrim(customer_phone)) between 8 and 25),
  customer_email text,
  address_street text,
  address_number text,
  address_neighborhood text,
  address_complement text,
  address_reference text,
  notes text,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(12, 2) not null check (total >= 0 and total = subtotal + delivery_fee),
  change_for numeric(12, 2) check (change_for is null or change_for >= 0),
  delivery_assigned_to uuid references public.profiles(id) on delete set null,
  delivery_assigned_at timestamptz,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_order_number_unique unique (order_number),
  constraint orders_access_token_unique unique (access_token),
  constraint orders_delivery_address_check check (
    delivery_type = 'PICKUP'
    or (
      nullif(btrim(address_street), '') is not null
      and nullif(btrim(address_number), '') is not null
      and nullif(btrim(address_neighborhood), '') is not null
    )
  ),
  constraint orders_change_for_payment_check check (
    change_for is null or (payment_method = 'CASH' and change_for >= total)
  )
);

create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_delivery_queue_idx on public.orders (delivery_type, status, created_at)
  where delivery_type = 'DELIVERY';
create index orders_delivery_assigned_idx on public.orders (delivery_assigned_to, status, created_at desc)
  where delivery_assigned_to is not null;
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0 and quantity <= 100),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price = unit_price * quantity),
  notes text,
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id) where product_id is not null;

create table public.order_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.order_print_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  print_area public.print_area not null,
  printed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_print_logs_order_idx on public.order_print_logs (order_id, created_at desc);

alter sequence public.order_number_seq owned by public.orders.order_number;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.apply_order_status_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'CONFIRMED' then new.accepted_at := coalesce(new.accepted_at, now());
      when 'PREPARING' then new.preparing_at := coalesce(new.preparing_at, now());
      when 'READY' then new.ready_at := coalesce(new.ready_at, now());
      when 'OUT_FOR_DELIVERY' then new.out_for_delivery_at := coalesce(new.out_for_delivery_at, now());
      when 'DELIVERED' then new.delivered_at := coalesce(new.delivered_at, now());
      when 'CANCELED' then new.canceled_at := coalesce(new.canceled_at, now());
      else null;
    end case;
  end if;
  return new;
end;
$$;

create or replace function private.record_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_history (order_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Cliente'
  );

  if char_length(v_name) < 2 then
    v_name := 'Cliente';
  end if;

  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    left(v_name, 120),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    'CUSTOMER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.apply_order_status_timestamp() from public;
revoke all on function private.record_order_status_change() from public;
revoke all on function private.handle_new_user() from public;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function private.set_updated_at();

create trigger orders_apply_status_timestamp
before update on public.orders
for each row execute function private.apply_order_status_timestamp();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

create trigger orders_record_status_change
after update on public.orders
for each row execute function private.record_order_status_change();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid()
    and p.active = true;
$$;

create or replace function private.has_role(p_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_user_role() = any(p_roles), false);
$$;

revoke all on function private.current_user_role() from public;
revoke all on function private.has_role(public.user_role[]) from public;
grant execute on function private.current_user_role() to authenticated, service_role;
grant execute on function private.has_role(public.user_role[]) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_print_logs enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.store_settings from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.order_status_history from anon, authenticated;
revoke all on table public.order_print_logs from anon, authenticated;

grant select on table public.categories, public.products, public.store_settings to anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant insert, update, delete on table public.categories, public.products, public.store_settings to authenticated;
grant select, update, delete on table public.orders, public.order_items to authenticated;
grant select on table public.order_status_history, public.order_print_logs to authenticated;

create policy profiles_select_self_or_admin
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.has_role(array['ADMIN'::public.user_role]))
);

create policy profiles_insert_admin
on public.profiles for insert to authenticated
with check ((select private.has_role(array['ADMIN'::public.user_role])));

create policy profiles_update_admin
on public.profiles for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));

create policy profiles_delete_admin
on public.profiles for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy categories_select_active_public
on public.categories for select to anon, authenticated
using (active = true);

create policy categories_select_admin
on public.categories for select to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy categories_insert_admin
on public.categories for insert to authenticated
with check ((select private.has_role(array['ADMIN'::public.user_role])));

create policy categories_update_admin
on public.categories for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));

create policy categories_delete_admin
on public.categories for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy products_select_active_public
on public.products for select to anon, authenticated
using (
  active = true
  and exists (
    select 1 from public.categories as c
    where c.id = products.category_id and c.active = true
  )
);

create policy products_select_admin
on public.products for select to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy products_insert_admin
on public.products for insert to authenticated
with check ((select private.has_role(array['ADMIN'::public.user_role])));

create policy products_update_admin
on public.products for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));

create policy products_delete_admin
on public.products for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy store_settings_select_public
on public.store_settings for select to anon, authenticated
using (true);

create policy store_settings_insert_admin
on public.store_settings for insert to authenticated
with check (id = 1 and (select private.has_role(array['ADMIN'::public.user_role])));

create policy store_settings_update_admin
on public.store_settings for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check (id = 1 and (select private.has_role(array['ADMIN'::public.user_role])));

create policy store_settings_delete_admin
on public.store_settings for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy orders_select_admin
on public.orders for select to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy orders_select_kitchen
on public.orders for select to authenticated
using (
  (select private.has_role(array['KITCHEN'::public.user_role]))
  and status in ('PENDING', 'CONFIRMED', 'PREPARING', 'READY')
);

create policy orders_select_delivery
on public.orders for select to authenticated
using (
  (select private.has_role(array['DELIVERY'::public.user_role]))
  and delivery_type = 'DELIVERY'
  and (
    status in ('READY', 'OUT_FOR_DELIVERY', 'DELIVERED')
    or delivery_assigned_to = (select auth.uid())
  )
);

create policy orders_update_admin
on public.orders for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));

create policy orders_delete_admin
on public.orders for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy order_items_select_internal
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders as o where o.id = order_items.order_id
  )
);

create policy order_items_update_admin
on public.order_items for update to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])))
with check ((select private.has_role(array['ADMIN'::public.user_role])));

create policy order_items_delete_admin
on public.order_items for delete to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy order_status_history_select_internal
on public.order_status_history for select to authenticated
using (
  exists (
    select 1 from public.orders as o where o.id = order_status_history.order_id
  )
);

create policy order_print_logs_select_admin
on public.order_print_logs for select to authenticated
using ((select private.has_role(array['ADMIN'::public.user_role])));

create policy order_print_logs_select_by_area
on public.order_print_logs for select to authenticated
using (
  (print_area = 'KITCHEN' and (select private.has_role(array['KITCHEN'::public.user_role])))
  or (print_area = 'DELIVERY' and (select private.has_role(array['DELIVERY'::public.user_role])))
);

create or replace function private.create_order_impl(payload jsonb)
returns table (
  order_id uuid,
  order_number bigint,
  access_token uuid,
  subtotal numeric,
  delivery_fee numeric,
  total numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_settings public.store_settings%rowtype;
  v_order public.orders%rowtype;
  v_product_id uuid;
  v_quantity integer;
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

  if v_phone is null or char_length(v_phone) not between 8 and 25
     or v_phone !~ '^[0-9+() .-]+$' then
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

  if jsonb_typeof(payload -> 'items') <> 'array'
     or jsonb_array_length(payload -> 'items') = 0
     or jsonb_array_length(payload -> 'items') > 100 then
    raise exception using errcode = '22023', message = 'O pedido deve conter entre 1 e 100 itens.';
  end if;

  select s.* into v_settings
  from public.store_settings as s
  where s.id = 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'As configurações da loja não foram cadastradas.';
  end if;

  if not v_settings.is_open then
    raise exception using errcode = 'P0001', message = 'A loja está fechada no momento.';
  end if;

  v_street := nullif(btrim(coalesce(payload #>> '{address,street}', payload ->> 'address_street')), '');
  v_number := nullif(btrim(coalesce(payload #>> '{address,number}', payload ->> 'address_number')), '');
  v_neighborhood := nullif(btrim(coalesce(payload #>> '{address,neighborhood}', payload ->> 'address_neighborhood')), '');

  if v_delivery_type = 'DELIVERY'
     and (v_street is null or v_number is null or v_neighborhood is null) then
    raise exception using errcode = '22023', message = 'Informe rua, número e bairro para entrega.';
  end if;

  for v_item in select value from jsonb_array_elements(payload -> 'items')
  loop
    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'Produto ou quantidade inválida.';
    end;

    if v_quantity is null or v_quantity <= 0 or v_quantity > 100 then
      raise exception using errcode = '22023', message = 'A quantidade de cada item deve estar entre 1 e 100.';
    end if;

    select p.* into v_product
    from public.products as p
    join public.categories as c on c.id = p.category_id
    where p.id = v_product_id
      and p.active = true
      and c.active = true
    for update of p;

    if not found then
      raise exception using errcode = 'P0001', message = 'Um dos produtos não está disponível.';
    end if;

    if v_product.stock_quantity is not null and v_product.stock_quantity < v_quantity then
      raise exception using errcode = 'P0001', message = format('Estoque insuficiente para %s.', v_product.name);
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);

    if v_product.stock_quantity is not null then
      update public.products
      set stock_quantity = stock_quantity - v_quantity
      where id = v_product.id;
    end if;
  end loop;

  if v_subtotal < v_settings.minimum_order_value then
    raise exception using
      errcode = 'P0001',
      message = format('O pedido mínimo é R$ %s.', to_char(v_settings.minimum_order_value, 'FM999999990D00'));
  end if;

  if v_delivery_type = 'DELIVERY' then
    v_delivery_fee := v_settings.delivery_fee;
  end if;

  if v_payment_method = 'CASH' and nullif(btrim(payload ->> 'change_for'), '') is not null then
    begin
      v_change_for := (payload ->> 'change_for')::numeric(12, 2);
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'Valor de troco inválido.';
    end;

    if v_change_for < v_subtotal + v_delivery_fee then
      raise exception using errcode = '22023', message = 'O valor para troco deve ser maior ou igual ao total.';
    end if;
  end if;

  insert into public.orders (
    delivery_type,
    payment_method,
    customer_name,
    customer_phone,
    customer_email,
    address_street,
    address_number,
    address_neighborhood,
    address_complement,
    address_reference,
    notes,
    subtotal,
    delivery_fee,
    total,
    change_for
  )
  values (
    v_delivery_type,
    v_payment_method,
    v_name,
    v_phone,
    v_email,
    case when v_delivery_type = 'DELIVERY' then v_street end,
    case when v_delivery_type = 'DELIVERY' then v_number end,
    case when v_delivery_type = 'DELIVERY' then v_neighborhood end,
    case when v_delivery_type = 'DELIVERY' then nullif(btrim(coalesce(payload #>> '{address,complement}', payload ->> 'address_complement')), '') end,
    case when v_delivery_type = 'DELIVERY' then nullif(btrim(coalesce(payload #>> '{address,reference}', payload ->> 'address_reference')), '') end,
    nullif(btrim(payload ->> 'notes'), ''),
    v_subtotal,
    v_delivery_fee,
    v_subtotal + v_delivery_fee,
    v_change_for
  )
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(payload -> 'items')
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    select p.* into strict v_product
    from public.products as p
    where p.id = v_product_id;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_price,
      notes
    )
    values (
      v_order.id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_product.price,
      v_product.price * v_quantity,
      nullif(btrim(v_item ->> 'notes'), '')
    );
  end loop;

  insert into public.order_status_history (order_id, old_status, new_status, changed_by)
  values (v_order.id, null, 'PENDING', auth.uid());

  return query
  select
    v_order.id,
    v_order.order_number,
    v_order.access_token,
    v_order.subtotal,
    v_order.delivery_fee,
    v_order.total;
end;
$$;

create or replace function private.update_order_status_impl(
  p_order_id uuid,
  p_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_result public.orders%rowtype;
  v_role public.user_role;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Autenticação obrigatória.';
  end if;

  if p_status is null then
    raise exception using errcode = '22023', message = 'O novo status é obrigatório.';
  end if;

  v_role := private.current_user_role();
  if v_role is null or v_role = 'CUSTOMER' then
    raise exception using errcode = '42501', message = 'Usuário sem permissão para atualizar pedidos.';
  end if;

  select o.* into v_order
  from public.orders as o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Pedido não encontrado.';
  end if;

  if v_order.status = p_status then
    raise exception using errcode = '22023', message = 'O pedido já está neste status.';
  end if;

  if v_role = 'KITCHEN' and not (
    (v_order.status in ('PENDING', 'CONFIRMED') and p_status = 'PREPARING')
    or (v_order.status = 'PREPARING' and p_status = 'READY')
  ) then
    raise exception using errcode = '42501', message = 'Transição não permitida para a cozinha.';
  elsif v_role = 'DELIVERY' and not (
    v_order.delivery_type = 'DELIVERY'
    and (
      (v_order.status = 'READY' and p_status = 'OUT_FOR_DELIVERY')
      or (
        v_order.status = 'OUT_FOR_DELIVERY'
        and p_status = 'DELIVERED'
        and v_order.delivery_assigned_to = auth.uid()
      )
    )
  ) then
    raise exception using errcode = '42501', message = 'Transição não permitida para o entregador.';
  end if;

  update public.orders
  set
    status = p_status,
    delivery_assigned_to = case
      when v_role = 'DELIVERY' and v_order.status = 'READY' and p_status = 'OUT_FOR_DELIVERY'
        then auth.uid()
      else delivery_assigned_to
    end,
    delivery_assigned_at = case
      when v_role = 'DELIVERY' and v_order.status = 'READY' and p_status = 'OUT_FOR_DELIVERY'
        then now()
      else delivery_assigned_at
    end
  where id = p_order_id
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function private.get_order_by_access_token_impl(p_access_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'delivery_type', o.delivery_type,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'customer_name', o.customer_name,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'accepted_at', o.accepted_at,
    'preparing_at', o.preparing_at,
    'ready_at', o.ready_at,
    'out_for_delivery_at', o.out_for_delivery_at,
    'delivered_at', o.delivered_at,
    'canceled_at', o.canceled_at,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'product_id', i.product_id,
          'product_name', i.product_name,
          'quantity', i.quantity,
          'unit_price', i.unit_price,
          'total_price', i.total_price,
          'notes', i.notes
        ) order by i.created_at, i.id
      )
      from public.order_items as i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders as o
  where o.access_token = p_access_token;
$$;

create or replace function private.get_kitchen_print_data_impl(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
begin
  if not private.has_role(array['ADMIN'::public.user_role, 'KITCHEN'::public.user_role]) then
    raise exception using errcode = '42501', message = 'Sem permissão para imprimir a comanda da cozinha.';
  end if;

  select jsonb_build_object(
    'order_id', o.id,
    'order_number', o.order_number,
    'delivery_type', o.delivery_type,
    'status', o.status,
    'customer_name', o.customer_name,
    'notes', o.notes,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'quantity', i.quantity,
          'product_name', i.product_name,
          'notes', i.notes
        ) order by i.created_at, i.id
      )
      from public.order_items as i
      where i.order_id = o.id
    ), '[]'::jsonb)
  ) into v_data
  from public.orders as o
  where o.id = p_order_id
    and (
      private.has_role(array['ADMIN'::public.user_role])
      or o.status in ('PENDING', 'CONFIRMED', 'PREPARING', 'READY')
    );

  if v_data is null then
    raise exception using errcode = 'P0002', message = 'Pedido não encontrado.';
  end if;

  insert into public.order_print_logs (order_id, print_area, printed_by)
  values (p_order_id, 'KITCHEN', auth.uid());

  return v_data;
end;
$$;

create or replace function private.get_delivery_print_data_impl(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
begin
  if not private.has_role(array['ADMIN'::public.user_role, 'DELIVERY'::public.user_role]) then
    raise exception using errcode = '42501', message = 'Sem permissão para imprimir a comanda de entrega.';
  end if;

  select jsonb_build_object(
    'order_id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'address_street', o.address_street,
    'address_number', o.address_number,
    'address_neighborhood', o.address_neighborhood,
    'address_complement', o.address_complement,
    'address_reference', o.address_reference,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'change_for', o.change_for,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'notes', o.notes,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'quantity', i.quantity,
          'product_name', i.product_name,
          'unit_price', i.unit_price,
          'total_price', i.total_price,
          'notes', i.notes
        ) order by i.created_at, i.id
      )
      from public.order_items as i
      where i.order_id = o.id
    ), '[]'::jsonb)
  ) into v_data
  from public.orders as o
  where o.id = p_order_id
    and (
      private.has_role(array['ADMIN'::public.user_role])
      or (
        o.delivery_type = 'DELIVERY'
        and (
          o.status in ('READY', 'OUT_FOR_DELIVERY', 'DELIVERED')
          or o.delivery_assigned_to = auth.uid()
        )
      )
    );

  if v_data is null then
    raise exception using errcode = 'P0002', message = 'Pedido não encontrado.';
  end if;

  insert into public.order_print_logs (order_id, print_area, printed_by)
  values (p_order_id, 'DELIVERY', auth.uid());

  return v_data;
end;
$$;

create or replace function public.create_order(payload jsonb)
returns table (
  order_id uuid,
  order_number bigint,
  access_token uuid,
  subtotal numeric,
  delivery_fee numeric,
  total numeric
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_order_impl(payload);
$$;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns public.orders
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.update_order_status_impl(p_order_id, p_status);
end;
$$;

create or replace function public.get_order_by_access_token(p_access_token uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_order_by_access_token_impl(p_access_token);
$$;

create or replace function public.get_kitchen_print_data(p_order_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_kitchen_print_data_impl(p_order_id);
$$;

create or replace function public.get_delivery_print_data(p_order_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_delivery_print_data_impl(p_order_id);
$$;

revoke all on function private.create_order_impl(jsonb) from public;
revoke all on function private.update_order_status_impl(uuid, public.order_status) from public;
revoke all on function private.get_order_by_access_token_impl(uuid) from public;
revoke all on function private.get_kitchen_print_data_impl(uuid) from public;
revoke all on function private.get_delivery_print_data_impl(uuid) from public;

grant execute on function private.create_order_impl(jsonb) to anon, authenticated, service_role;
grant execute on function private.update_order_status_impl(uuid, public.order_status) to authenticated, service_role;
grant execute on function private.get_order_by_access_token_impl(uuid) to anon, authenticated, service_role;
grant execute on function private.get_kitchen_print_data_impl(uuid) to authenticated, service_role;
grant execute on function private.get_delivery_print_data_impl(uuid) to authenticated, service_role;

revoke all on function public.create_order(jsonb) from public;
revoke all on function public.update_order_status(uuid, public.order_status) from public;
revoke all on function public.get_order_by_access_token(uuid) from public;
revoke all on function public.get_kitchen_print_data(uuid) from public;
revoke all on function public.get_delivery_print_data(uuid) from public;

grant execute on function public.create_order(jsonb) to anon, authenticated, service_role;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated, service_role;
grant execute on function public.get_order_by_access_token(uuid) to anon, authenticated, service_role;
grant execute on function public.get_kitchen_print_data(uuid) to authenticated, service_role;
grant execute on function public.get_delivery_print_data(uuid) to authenticated, service_role;

create view public.report_daily_summary
with (security_invoker = true)
as
select
  timezone('America/Sao_Paulo', o.created_at)::date as sale_date,
  count(*) filter (where o.status = 'DELIVERED')::bigint as orders_count,
  count(*) filter (where o.status = 'CANCELED')::bigint as canceled_count,
  coalesce(sum(o.subtotal) filter (where o.status = 'DELIVERED'), 0)::numeric(14, 2) as subtotal_total,
  coalesce(sum(o.delivery_fee) filter (where o.status = 'DELIVERED'), 0)::numeric(14, 2) as delivery_fee_total,
  coalesce(sum(o.total) filter (where o.status = 'DELIVERED'), 0)::numeric(14, 2) as total_sales,
  coalesce(avg(o.total) filter (where o.status = 'DELIVERED'), 0)::numeric(14, 2) as average_ticket
from public.orders as o
where private.has_role(array['ADMIN'::public.user_role])
group by timezone('America/Sao_Paulo', o.created_at)::date;

create view public.report_items_sold_by_day
with (security_invoker = true)
as
select
  timezone('America/Sao_Paulo', o.delivered_at)::date as sale_date,
  i.product_id,
  i.product_name,
  c.name as category_name,
  sum(i.quantity)::bigint as quantity_sold,
  sum(i.total_price)::numeric(14, 2) as revenue
from public.order_items as i
join public.orders as o on o.id = i.order_id
left join public.products as p on p.id = i.product_id
left join public.categories as c on c.id = p.category_id
where o.status = 'DELIVERED'
  and private.has_role(array['ADMIN'::public.user_role])
group by timezone('America/Sao_Paulo', o.delivered_at)::date, i.product_id, i.product_name, c.name;

create view public.report_top_products_last_30_days
with (security_invoker = true)
as
select
  i.product_id,
  i.product_name,
  c.name as category_name,
  sum(i.quantity)::bigint as quantity_sold,
  sum(i.total_price)::numeric(14, 2) as revenue,
  max(o.delivered_at) as last_sold_at
from public.order_items as i
join public.orders as o on o.id = i.order_id
left join public.products as p on p.id = i.product_id
left join public.categories as c on c.id = p.category_id
where o.status = 'DELIVERED'
  and o.delivered_at >= now() - interval '30 days'
  and private.has_role(array['ADMIN'::public.user_role])
group by i.product_id, i.product_name, c.name;

create view public.report_category_sales
with (security_invoker = true)
as
select
  c.id as category_id,
  c.name as category_name,
  sum(i.quantity)::bigint as quantity_sold,
  sum(i.total_price)::numeric(14, 2) as revenue,
  max(o.delivered_at) as last_sold_at
from public.order_items as i
join public.orders as o on o.id = i.order_id
join public.products as p on p.id = i.product_id
join public.categories as c on c.id = p.category_id
where o.status = 'DELIVERED'
  and private.has_role(array['ADMIN'::public.user_role])
group by c.id, c.name;

create view public.report_purchase_suggestions
with (security_invoker = true)
as
with sales as (
  select
    i.product_id,
    coalesce(sum(i.quantity) filter (where o.delivered_at >= now() - interval '7 days'), 0)::bigint as sold_last_7_days,
    coalesce(sum(i.quantity) filter (where o.delivered_at >= now() - interval '30 days'), 0)::bigint as sold_last_30_days
  from public.order_items as i
  join public.orders as o on o.id = i.order_id
  where o.status = 'DELIVERED'
  group by i.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  c.name as category_name,
  p.stock_quantity,
  p.low_stock_threshold,
  coalesce(s.sold_last_7_days, 0) as sold_last_7_days,
  coalesce(s.sold_last_30_days, 0) as sold_last_30_days,
  (
    p.stock_quantity is not null
    and p.stock_quantity <= coalesce(p.low_stock_threshold, 0)
  ) as low_stock,
  (
    p.stock_quantity is not null
    and (
      p.stock_quantity <= coalesce(p.low_stock_threshold, 0)
      or p.stock_quantity < coalesce(s.sold_last_7_days, 0)
    )
  ) as purchase_alert
from public.products as p
join public.categories as c on c.id = p.category_id
left join sales as s on s.product_id = p.id
where private.has_role(array['ADMIN'::public.user_role]);

revoke all on table public.report_daily_summary from anon, authenticated;
revoke all on table public.report_items_sold_by_day from anon, authenticated;
revoke all on table public.report_top_products_last_30_days from anon, authenticated;
revoke all on table public.report_category_sales from anon, authenticated;
revoke all on table public.report_purchase_suggestions from anon, authenticated;

grant select on table public.report_daily_summary to authenticated;
grant select on table public.report_items_sold_by_day to authenticated;
grant select on table public.report_top_products_last_30_days to authenticated;
grant select on table public.report_category_sales to authenticated;
grant select on table public.report_purchase_suggestions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_insert_admin
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (select private.has_role(array['ADMIN'::public.user_role]))
);

create policy product_images_select_admin
on storage.objects for select to authenticated
using (
  bucket_id = 'product-images'
  and (select private.has_role(array['ADMIN'::public.user_role]))
);

create policy product_images_update_admin
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and (select private.has_role(array['ADMIN'::public.user_role]))
)
with check (
  bucket_id = 'product-images'
  and (select private.has_role(array['ADMIN'::public.user_role]))
);

create policy product_images_delete_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (select private.has_role(array['ADMIN'::public.user_role]))
);

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

insert into public.store_settings (
  id,
  name,
  is_open,
  delivery_fee,
  minimum_order_value,
  opening_hours
)
values (1, 'Minha Lanchonete', true, 0, 0, '{}'::jsonb)
on conflict (id) do nothing;

commit;
