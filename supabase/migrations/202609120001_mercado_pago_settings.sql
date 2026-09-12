-- Secure, switchable Mercado Pago environments managed by administrators.

create table public.mercado_pago_settings (
  environment text primary key check (environment in ('TEST', 'PRODUCTION')),
  public_key text,
  access_token text,
  webhook_secret text,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint mercado_pago_public_key_format check (public_key is null or public_key like 'APP_USR-%'),
  constraint mercado_pago_access_token_format check (access_token is null or access_token like 'APP_USR-%')
);

alter table public.store_settings
  add column mercado_pago_environment text not null default 'TEST'
  check (mercado_pago_environment in ('TEST', 'PRODUCTION'));

alter table public.orders
  add column payment_environment text
  check (payment_environment is null or payment_environment in ('TEST', 'PRODUCTION'));

insert into public.mercado_pago_settings(environment) values ('TEST'), ('PRODUCTION');

alter table public.mercado_pago_settings enable row level security;
revoke all on table public.mercado_pago_settings from anon, authenticated;
grant all on table public.mercado_pago_settings to service_role;

create or replace function public.get_mercado_pago_public_settings()
returns table(environment text, public_key text, enabled boolean)
language sql stable security definer set search_path = '' as $$
  select m.environment, m.public_key,
    (m.enabled and m.public_key is not null and m.access_token is not null and m.webhook_secret is not null) as enabled
  from public.store_settings s
  join public.mercado_pago_settings m on m.environment = s.mercado_pago_environment
  where s.id = 1;
$$;

create or replace function public.get_mercado_pago_admin_settings()
returns table(environment text, public_key text, enabled boolean, access_token_configured boolean, webhook_secret_configured boolean, active boolean, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_role(array['ADMIN'::public.user_role]) then
    raise exception using errcode = '42501', message = 'Acesso permitido somente para administradores.';
  end if;
  return query
  select m.environment, m.public_key, m.enabled, m.access_token is not null, m.webhook_secret is not null,
    m.environment = s.mercado_pago_environment, m.updated_at
  from public.mercado_pago_settings m cross join public.store_settings s
  where s.id = 1 order by m.environment desc;
end;
$$;

create or replace function public.save_mercado_pago_settings(
  p_environment text,
  p_public_key text,
  p_access_token text default null,
  p_webhook_secret text default null,
  p_enabled boolean default false,
  p_activate boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_environment text := upper(btrim(p_environment));
begin
  if not private.has_role(array['ADMIN'::public.user_role]) then
    raise exception using errcode = '42501', message = 'Acesso permitido somente para administradores.';
  end if;
  if v_environment not in ('TEST','PRODUCTION') then
    raise exception using errcode = '22023', message = 'Ambiente inválido.';
  end if;
  if nullif(btrim(p_public_key), '') is null or p_public_key not like 'APP_USR-%' then
    raise exception using errcode = '22023', message = 'Public Key inválida.';
  end if;
  if nullif(btrim(p_access_token), '') is not null and p_access_token not like 'APP_USR-%' then
    raise exception using errcode = '22023', message = 'Access Token inválido.';
  end if;

  update public.mercado_pago_settings set
    public_key = btrim(p_public_key),
    access_token = coalesce(nullif(btrim(p_access_token), ''), access_token),
    webhook_secret = coalesce(nullif(btrim(p_webhook_secret), ''), webhook_secret),
    enabled = p_enabled,
    updated_at = now(),
    updated_by = auth.uid()
  where environment = v_environment;

  if p_activate then
    if not exists (select 1 from public.mercado_pago_settings m where m.environment=v_environment and m.public_key is not null and m.access_token is not null and m.webhook_secret is not null) then
      raise exception using errcode = '22023', message = 'Cadastre Public Key, Access Token e assinatura do webhook antes de ativar.';
    end if;
    update public.store_settings set mercado_pago_environment=v_environment where id=1;
  end if;
end;
$$;

revoke all on function public.get_mercado_pago_public_settings() from public;
revoke all on function public.get_mercado_pago_admin_settings() from public;
revoke all on function public.save_mercado_pago_settings(text,text,text,text,boolean,boolean) from public;
grant execute on function public.get_mercado_pago_public_settings() to anon, authenticated, service_role;
grant execute on function public.get_mercado_pago_admin_settings() to authenticated, service_role;
grant execute on function public.save_mercado_pago_settings(text,text,text,text,boolean,boolean) to authenticated, service_role;
