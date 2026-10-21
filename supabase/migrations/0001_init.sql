-- Viagem da Galera: esquema inicial.
--
-- Tudo fica em tabelas com prefixo trip_ (e a tabela trips), separadas de
-- qualquer outra coisa que exista no mesmo projeto do Supabase.
--
-- Não há conta nem senha: quem tem o código da viagem participa. O app manda
-- o código no cabeçalho HTTP x-trip-code e as regras (RLS) só liberam as
-- linhas daquela viagem. Sem código, não se lê nem se grava nada.

-- ---------------------------------------------------------------------------
-- Viagem
-- ---------------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{10,16}$'),
  name text not null check (length(trim(name)) between 1 and 80),
  emoji text not null default '✈️' check (length(emoji) <= 16),
  start_date date,
  end_date date,
  base_currency text not null default 'BRL' check (base_currency in ('BRL', 'USD', 'CAD', 'EUR')),
  notes text not null default '' check (length(notes) <= 4000),
  created_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

-- Código que veio no cabeçalho da requisição (PostgREST guarda os cabeçalhos em request.headers).
create function public.trip_header_code() returns text
language sql stable
set search_path = ''
as $$
  select upper(nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-trip-code', ''))
$$;

-- Viagem liberada para esta requisição (ou null).
create function public.trip_current() returns uuid
language sql stable security definer
set search_path = ''
as $$
  select t.id from public.trips t where t.code = public.trip_header_code()
$$;

-- ---------------------------------------------------------------------------
-- Pessoas (o "login" é só escolher o nome)
-- ---------------------------------------------------------------------------

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  color text not null default '#1A7FB0' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  emoji text not null default '' check (length(emoji) <= 16),
  created_at timestamptz not null default now()
);
create unique index trip_members_name_key on public.trip_members (trip_id, lower(trim(name)));

-- ---------------------------------------------------------------------------
-- Paradas (cidades) com datas: Orlando, Miami, Toronto...
-- ---------------------------------------------------------------------------

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  city text not null check (length(trim(city)) between 1 and 80),
  country text not null default 'US' check (country ~ '^[A-Z]{2}$'),
  start_date date,
  end_date date,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  notes text not null default '' check (length(notes) <= 2000),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

-- ---------------------------------------------------------------------------
-- Ideias / links: hotel, passeio, restaurante, voo, documento...
-- Viram roteiro quando ganham um dia.
-- ---------------------------------------------------------------------------

create table public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  category text not null default 'passeio'
    check (category in ('hospedagem', 'voo', 'transporte', 'passeio', 'parque', 'comida', 'compras', 'documento', 'dica', 'outro')),
  title text not null check (length(trim(title)) between 1 and 200),
  url text not null default '' check (length(url) <= 2000),
  image_url text not null default '' check (length(image_url) <= 2000),
  site text not null default '' check (length(site) <= 120),
  description text not null default '' check (length(description) <= 1000),
  note text not null default '' check (length(note) <= 4000),
  stop_id uuid references public.trip_stops (id) on delete set null,
  status text not null default 'ideia' check (status in ('ideia', 'aprovado', 'reservado', 'descartado')),
  day date,
  end_day date,
  start_time time,
  price numeric(12, 2) check (price is null or price >= 0),
  currency text not null default 'USD' check (currency in ('BRL', 'USD', 'CAD', 'EUR')),
  price_per text not null default 'total' check (price_per in ('total', 'pessoa')),
  address text not null default '' check (length(address) <= 300),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  confirmation text not null default '' check (length(confirmation) <= 200),
  created_by uuid references public.trip_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (day is null or end_day is null or end_day >= day)
);

create table public.trip_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  item_id uuid not null references public.trip_items (id) on delete cascade,
  member_id uuid not null references public.trip_members (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (item_id, member_id)
);

create table public.trip_comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  item_id uuid not null references public.trip_items (id) on delete cascade,
  member_id uuid references public.trip_members (id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Checklist: "grupo" (alguém faz por todos) ou "cada" (cada um marca o seu)
-- ---------------------------------------------------------------------------

create table public.trip_tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  section text not null default 'outros' check (length(section) between 1 and 40),
  scope text not null default 'grupo' check (scope in ('grupo', 'cada')),
  assignee uuid references public.trip_members (id) on delete set null,
  done boolean not null default false,
  done_by uuid[] not null default '{}',
  due date,
  note text not null default '' check (length(note) <= 2000),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Gastos divididos. "acerto" = alguém pagou outra pessoa para zerar a conta.
-- rate = quanto 1 unidade da moeda vale na moeda base da viagem.
-- shares (opcional) = { "<member_id>": valor na moeda do gasto } para divisão desigual.
-- ---------------------------------------------------------------------------

create table public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  kind text not null default 'gasto' check (kind in ('gasto', 'acerto')),
  title text not null check (length(trim(title)) between 1 and 200),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD' check (currency in ('BRL', 'USD', 'CAD', 'EUR')),
  rate numeric(14, 6) not null default 1 check (rate > 0),
  paid_by uuid not null references public.trip_members (id) on delete restrict,
  split_among uuid[] not null check (cardinality(split_among) between 1 and 30),
  shares jsonb check (shares is null or jsonb_typeof(shares) = 'object'),
  category text not null default 'outros' check (length(category) between 1 and 40),
  spent_on date not null default current_date,
  item_id uuid references public.trip_items (id) on delete set null,
  note text not null default '' check (length(note) <= 2000),
  created_by uuid references public.trip_members (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Enquetes ("Qual mês vamos?", "Qual hotel em Orlando?")
-- options = [{ "id": "a", "text": "Junho" }, ...]
-- ---------------------------------------------------------------------------

create table public.trip_polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  question text not null check (length(trim(question)) between 1 and 200),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 12),
  multi boolean not null default false,
  closed boolean not null default false,
  created_by uuid references public.trip_members (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.trip_poll_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null default public.trip_current() references public.trips (id) on delete cascade,
  poll_id uuid not null references public.trip_polls (id) on delete cascade,
  member_id uuid not null references public.trip_members (id) on delete cascade,
  option_id text not null check (length(option_id) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (poll_id, member_id, option_id)
);

-- ---------------------------------------------------------------------------
-- updated_at das ideias
-- ---------------------------------------------------------------------------

create function public.trip_touch() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger trip_items_touch before update on public.trip_items
  for each row execute function public.trip_touch();

-- ---------------------------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------------------------

alter table public.trips enable row level security;

create policy "trips: ler a própria" on public.trips
  for select to anon, authenticated
  using (id = (select public.trip_current()));

create policy "trips: editar a própria" on public.trips
  for update to anon, authenticated
  using (id = (select public.trip_current()))
  with check (id = (select public.trip_current()));

create policy "trips: apagar a própria" on public.trips
  for delete to anon, authenticated
  using (id = (select public.trip_current()));

-- O código da viagem não muda depois de criado.
create function public.trip_keep_code() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código da viagem não pode mudar';
  end if;
  return new;
end
$$;

create trigger trips_keep_code before update on public.trips
  for each row execute function public.trip_keep_code();

do $$
declare
  t text;
begin
  foreach t in array array['trip_members', 'trip_stops', 'trip_items', 'trip_votes', 'trip_comments', 'trip_tasks', 'trip_expenses', 'trip_polls', 'trip_poll_votes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated
         using (trip_id = (select public.trip_current()))
         with check (trip_id = (select public.trip_current()))',
      t || ': da viagem', t
    );
    execute format('create index %I on public.%I (trip_id)', t || '_trip_idx', t);
  end loop;
end
$$;

-- Índices das chaves estrangeiras.
create index trip_items_stop_idx on public.trip_items (stop_id);
create index trip_items_created_by_idx on public.trip_items (created_by);
create index trip_votes_member_idx on public.trip_votes (member_id);
create index trip_comments_item_idx on public.trip_comments (item_id);
create index trip_comments_member_idx on public.trip_comments (member_id);
create index trip_tasks_assignee_idx on public.trip_tasks (assignee);
create index trip_expenses_paid_by_idx on public.trip_expenses (paid_by);
create index trip_expenses_item_idx on public.trip_expenses (item_id);
create index trip_expenses_created_by_idx on public.trip_expenses (created_by);
create index trip_polls_created_by_idx on public.trip_polls (created_by);
create index trip_poll_votes_poll_idx on public.trip_poll_votes (poll_id);
create index trip_poll_votes_member_idx on public.trip_poll_votes (member_id);

-- ---------------------------------------------------------------------------
-- Criar viagem: gera um código aleatório de 12 caracteres (sem 0/O, 1/I)
-- e já cadastra a primeira pessoa.
-- ---------------------------------------------------------------------------

create function public.trip_create(p_name text, p_member text, p_start date default null, p_end date default null, p_emoji text default '✈️')
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  v_code text;
  v_trip uuid;
  v_member uuid;
begin
  if length(trim(coalesce(p_member, ''))) = 0 then
    raise exception 'Informe seu nome';
  end if;
  loop
    -- gen_random_uuid usa o gerador seguro do Postgres; os bytes 6 e 8 têm bits fixos de versão, então ficam de fora.
    bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    for i in 0..15 loop
      if i not in (6, 8) and length(v_code) < 12 then
        v_code := v_code || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
      end if;
    end loop;
    exit when not exists (select 1 from public.trips where code = v_code);
  end loop;

  insert into public.trips (code, name, start_date, end_date, emoji)
  values (v_code, trim(p_name), p_start, p_end, coalesce(nullif(p_emoji, ''), '✈️'))
  returning id into v_trip;

  insert into public.trip_members (trip_id, name)
  values (v_trip, trim(p_member))
  returning id into v_member;

  return json_build_object('code', v_code, 'trip_id', v_trip, 'member_id', v_member);
end
$$;

grant execute on function public.trip_create(text, text, date, date, text) to anon, authenticated;
grant execute on function public.trip_current() to anon, authenticated;
grant execute on function public.trip_header_code() to anon, authenticated;
