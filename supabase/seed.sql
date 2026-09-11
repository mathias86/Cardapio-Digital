-- Seed opcional para desenvolvimento local.
-- Não cria usuários internos: cadastre-os pelo Supabase Auth e promova o papel
-- diretamente no banco usando uma sessão administrativa segura.

insert into public.store_settings (
  id,
  name,
  is_open,
  delivery_fee,
  minimum_order_value,
  opening_hours,
  phone,
  whatsapp,
  address,
  pix_name
)
values (
  1,
  'Burger da Casa',
  true,
  7.00,
  20.00,
  '{
    "monday": {"open": "18:00", "close": "23:30"},
    "tuesday": {"open": "18:00", "close": "23:30"},
    "wednesday": {"open": "18:00", "close": "23:30"},
    "thursday": {"open": "18:00", "close": "23:30"},
    "friday": {"open": "18:00", "close": "00:30"},
    "saturday": {"open": "18:00", "close": "00:30"},
    "sunday": {"open": "18:00", "close": "23:30"}
  }'::jsonb,
  '(11) 99999-9999',
  '5511999999999',
  'Rua Exemplo, 123 - Centro',
  'Burger da Casa'
)
on conflict (id) do update
set
  name = excluded.name,
  delivery_fee = excluded.delivery_fee,
  minimum_order_value = excluded.minimum_order_value,
  opening_hours = excluded.opening_hours,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  address = excluded.address,
  pix_name = excluded.pix_name;

insert into public.categories (id, name, description, active, display_order)
values
  ('10000000-0000-4000-8000-000000000001', 'Hambúrgueres', 'Hambúrgueres artesanais preparados na hora.', true, 1),
  ('10000000-0000-4000-8000-000000000002', 'Acompanhamentos', 'Porções para completar seu pedido.', true, 2),
  ('10000000-0000-4000-8000-000000000003', 'Bebidas', 'Bebidas geladas.', true, 3)
on conflict (id) do nothing;

insert into public.products (
  id,
  category_id,
  name,
  description,
  price,
  active,
  stock_quantity,
  low_stock_threshold,
  display_order
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Clássico da Casa',
    'Pão brioche, carne artesanal, queijo, alface, tomate e molho da casa.',
    28.90,
    true,
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Duplo Bacon',
    'Dois hambúrgueres, queijo, bacon crocante e molho especial.',
    36.90,
    true,
    null,
    null,
    2
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    'Batata Frita',
    'Batata frita crocante com sal da casa.',
    16.00,
    true,
    30,
    8,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000003',
    'Refrigerante Lata',
    'Lata 350 ml. Escolha o sabor nas observações.',
    7.00,
    true,
    48,
    12,
    1
  )
on conflict (id) do nothing;
