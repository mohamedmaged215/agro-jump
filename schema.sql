-- Agro Jump — بنية قاعدة البيانات (مطبّقة على Supabase). للمرجع فقط.
create extension if not exists pgcrypto with schema extensions;

create table agro_materials (
  id bigint generated always as identity primary key,
  name text not null, unit text not null default 'kg',
  price_per_kg numeric(12,2) not null default 0,
  low_stock numeric(12,3) not null default 0,
  created_at timestamptz not null default now());

create table agro_products (
  id bigint generated always as identity primary key,
  name text not null, sale_price numeric(12,2) not null default 0,
  low_stock numeric(12,3) not null default 0,
  created_at timestamptz not null default now());

create table agro_recipe (
  id bigint generated always as identity primary key,
  product_id bigint not null references agro_products(id) on delete cascade,
  material_id bigint not null references agro_materials(id) on delete restrict,
  quantity_kg numeric(12,4) not null, unique (product_id, material_id));

create type agro_movement_type as enum
  ('purchase','issue','production','sale','adjust_material','adjust_product');

create table agro_movements (
  id bigint generated always as identity primary key,
  type agro_movement_type not null,
  material_id bigint references agro_materials(id),
  product_id bigint references agro_products(id),
  quantity numeric(12,4) not null, unit_price numeric(12,2),
  note text, created_at timestamptz not null default now());

create table agro_users (
  id bigint generated always as identity primary key,
  username text not null unique, password_hash text not null,
  role text not null check (role in ('factory','store')),
  created_at timestamptz not null default now());

create view agro_material_stock as
select m.id,m.name,m.unit,m.price_per_kg,m.low_stock,
  coalesce(sum(case mv.type when 'purchase' then mv.quantity
    when 'issue' then -mv.quantity when 'adjust_material' then mv.quantity else 0 end),0) as balance_kg
from agro_materials m left join agro_movements mv on mv.material_id=m.id group by m.id;

create view agro_product_stock as
select p.id,p.name,p.sale_price,p.low_stock,
  coalesce(sum(case mv.type when 'production' then mv.quantity
    when 'sale' then -mv.quantity when 'adjust_product' then mv.quantity else 0 end),0) as balance
from agro_products p left join agro_movements mv on mv.product_id=p.id group by p.id;

create view agro_product_cost as
select p.id,p.name,p.sale_price,
  coalesce(sum(r.quantity_kg*m.price_per_kg),0) as cost,
  p.sale_price-coalesce(sum(r.quantity_kg*m.price_per_kg),0) as profit
from agro_products p left join agro_recipe r on r.product_id=p.id
left join agro_materials m on m.id=r.material_id group by p.id;

create or replace function agro_record_purchase(
  p_material_id bigint,p_quantity numeric,p_price_per_kg numeric,p_note text default null)
returns void language plpgsql as $$
begin
  insert into agro_movements(type,material_id,quantity,unit_price,note)
  values ('purchase',p_material_id,p_quantity,p_price_per_kg,p_note);
  update agro_materials set price_per_kg=p_price_per_kg where id=p_material_id;
end;$$;

create or replace function agro_login(p_username text,p_password text)
returns text language plpgsql security definer set search_path=public,extensions as $$
declare r text;
begin
  select role into r from agro_users
  where username=p_username and password_hash=crypt(p_password,password_hash);
  return r;
end;$$;
