-- =========================================================================
-- GharCare (گھر کیئر) — manpower supply schema v1
-- Customers book cleaners / plumbers / electricians / mechanics etc.
-- hourly or daily. GharCare assigns its OWN staff from the admin panel.
-- =========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- customers may edit their name but never their role / phone
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and coalesce(auth.role(),'') <> 'service_role' then
    new.role := old.role;
    new.phone := old.phone;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------- catalog
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ur text not null,
  icon text not null default '🛠️',
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name_en text not null,
  name_ur text not null,
  description_en text not null default '',
  description_ur text not null default '',
  hourly_rate int not null default 0,      -- PKR per worker per hour
  daily_rate int not null default 0,       -- PKR per worker per day (8 hrs)
  min_hours int not null default 2,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------- own staff
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  cnic text,
  category_id uuid references public.categories(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  daily_wage int not null default 0,       -- what GharCare pays the worker per day
  status text not null default 'active' check (status in ('active','on_leave','inactive')),
  notes text,
  joined_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref_no bigint generated always as identity (start with 1001),
  customer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  service_id uuid not null references public.services(id),
  area_id uuid references public.areas(id),
  address text not null,
  booking_type text not null check (booking_type in ('hourly','daily')),
  work_date date not null,
  start_time time not null default '09:00',
  quantity numeric(5,1) not null check (quantity > 0),   -- hours or days
  workers int not null default 1 check (workers between 1 and 20),
  rate int not null default 0,
  est_total int not null default 0,
  notes text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','assigned','in_progress','completed','cancelled')),
  staff_id uuid references public.staff(id) on delete set null,
  final_amount int,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists bookings_status_idx on public.bookings(status, work_date);

-- price is always computed server-side from the service rates
create or replace function public.price_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.services;
begin
  select * into s from public.services where id = new.service_id;
  if s.id is null then raise exception 'Unknown service'; end if;
  if tg_op = 'INSERT' and not public.is_admin() then
    if not s.is_active then raise exception 'Service not available'; end if;
    new.status := 'pending';
    new.staff_id := null;
    new.final_amount := null;
    new.admin_notes := null;
    new.customer_id := auth.uid();
    if new.booking_type = 'hourly' and new.quantity < s.min_hours then
      new.quantity := s.min_hours;
    end if;
  end if;
  if tg_op = 'INSERT' or new.quantity <> old.quantity or new.workers <> old.workers
     or new.booking_type <> old.booking_type or new.service_id <> old.service_id then
    new.rate := case when new.booking_type = 'hourly' then s.hourly_rate else s.daily_rate end;
    new.est_total := round(new.rate * new.quantity * new.workers);
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists price_booking on public.bookings;
create trigger price_booking before insert or update on public.bookings
  for each row execute function public.price_booking();

-- ---------------------------------------------------------------- settings
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'GharCare',
  town text not null default '',
  phone text not null default '+923259444057',
  whatsapp text not null default '+923259444057',
  email text not null default 'gharcarepk@gmail.com',
  hours_text text not null default '8:00 AM – 8:00 PM, 7 days',
  announcement_en text not null default '',
  announcement_ur text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------- RPCs
-- customer view of own bookings incl. assigned worker name + phone
create or replace function public.my_bookings()
returns table (
  id uuid, ref_no bigint, service_en text, service_ur text, icon text,
  booking_type text, work_date date, start_time time, quantity numeric,
  workers int, est_total int, final_amount int, status text, address text,
  staff_name text, staff_phone text, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select b.id, b.ref_no, s.name_en, s.name_ur, c.icon, b.booking_type, b.work_date,
         b.start_time, b.quantity, b.workers, b.est_total, b.final_amount, b.status,
         b.address,
         case when b.status in ('assigned','in_progress','completed') then st.full_name end,
         case when b.status in ('assigned','in_progress') then st.phone end,
         b.created_at
  from public.bookings b
  join public.services s on s.id = b.service_id
  join public.categories c on c.id = s.category_id
  left join public.staff st on st.id = b.staff_id
  where b.customer_id = auth.uid()
  order by b.created_at desc;
$$;

create or replace function public.cancel_my_booking(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.bookings set status = 'cancelled', updated_at = now()
  where id = p_id and customer_id = auth.uid() and status in ('pending','confirmed');
  if not found then raise exception 'Booking cannot be cancelled'; end if;
end $$;

revoke execute on function public.my_bookings() from anon;
revoke execute on function public.cancel_my_booking(uuid) from anon;

-- ---------------------------------------------------------------- RLS
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.services   enable row level security;
alter table public.areas      enable row level security;
alter table public.staff      enable row level security;
alter table public.bookings   enable row level security;
alter table public.settings   enable row level security;

create policy "profiles self read"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles self update" on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy "categories public" on public.categories for select using (is_active or public.is_admin());
create policy "categories admin"  on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "services public"   on public.services for select using (is_active or public.is_admin());
create policy "services admin"    on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy "areas public"      on public.areas for select using (is_active or public.is_admin());
create policy "areas admin"       on public.areas for all using (public.is_admin()) with check (public.is_admin());
create policy "settings public"   on public.settings for select using (true);
create policy "settings admin"    on public.settings for update using (public.is_admin()) with check (public.is_admin());

create policy "staff admin" on public.staff for all using (public.is_admin()) with check (public.is_admin());

create policy "bookings own read"   on public.bookings for select using (customer_id = auth.uid() or public.is_admin());
create policy "bookings own insert" on public.bookings for insert to authenticated with check (customer_id = auth.uid() or public.is_admin());
create policy "bookings admin"      on public.bookings for update using (public.is_admin()) with check (public.is_admin());
create policy "bookings admin del"  on public.bookings for delete using (public.is_admin());

-- ---------------------------------------------------------------- seed
insert into public.categories (name_en, name_ur, icon, sort_order) values
  ('Cleaning',     'صفائی',          '🧹', 1),
  ('Plumbing',     'پلمبنگ',         '🔧', 2),
  ('Electrical',   'بجلی کا کام',    '💡', 3),
  ('Mechanic',     'مکینک',          '🚗', 4),
  ('AC & Fridge',  'اے سی اور فریج', '❄️', 5),
  ('Painting',     'رنگ و روغن',     '🎨', 6),
  ('Helper / Labour', 'مددگار / مزدور', '💪', 7),
  ('Carpenter',    'بڑھئی',          '🪚', 8)
on conflict do nothing;

insert into public.services (category_id, name_en, name_ur, description_en, description_ur, hourly_rate, daily_rate, min_hours, sort_order)
select c.id, v.name_en, v.name_ur, v.d_en, v.d_ur, v.hr, v.dr, v.mh, v.so
from (values
  ('Cleaning',   'House Cleaning',        'گھر کی صفائی',      'Sweeping, mopping, dusting, kitchen & washrooms.', 'جھاڑو، پوچا، ڈسٹنگ، کچن اور باتھ روم کی صفائی۔', 500, 3000, 2, 1),
  ('Cleaning',   'Deep Cleaning',         'مکمل گہری صفائی',    'Full deep clean for move-in, events or festivals.', 'شفٹنگ، تقریب یا تہوار کے لیے مکمل صفائی۔', 700, 4500, 3, 2),
  ('Cleaning',   'Sofa & Carpet Cleaning','صوفہ اور قالین کی صفائی', 'Washing of sofas, carpets and rugs.', 'صوفوں، قالینوں اور دریوں کی دھلائی۔', 800, 5000, 2, 3),
  ('Plumbing',   'Plumber',               'پلمبر',             'Leaks, taps, pipes, motors, tanks and fittings.', 'لیکیج، نلکے، پائپ، موٹر، ٹینکی اور فٹنگ۔', 800, 4500, 1, 1),
  ('Electrical', 'Electrician',           'الیکٹریشن',         'Wiring, switches, fans, lights, UPS & DB boards.', 'وائرنگ، سوئچ، پنکھے، لائٹس، یو پی ایس اور بورڈ۔', 800, 4500, 1, 1),
  ('Mechanic',   'Car Mechanic',          'گاڑی مکینک',        'Home visit for car checkup, battery, minor repairs.', 'گھر پر گاڑی کا معائنہ، بیٹری اور چھوٹی مرمت۔', 1000, 6000, 1, 1),
  ('Mechanic',   'Motorcycle Mechanic',   'موٹر سائیکل مکینک',  'Bike tuning, puncture, oil change at your door.', 'بائیک ٹیوننگ، پنکچر، آئل چینج آپ کے دروازے پر۔', 600, 3500, 1, 2),
  ('AC & Fridge','AC Service & Repair',   'اے سی سروس اور مرمت', 'AC service, gas filling, installation, repair.', 'اے سی سروس، گیس، فٹنگ اور مرمت۔', 1000, 6000, 1, 1),
  ('Painting',   'Painter',               'پینٹر',             'Wall paint, distemper, polish and touch-ups.', 'دیواروں کا رنگ، ڈسٹمپر، پالش اور مرمت۔', 600, 4000, 4, 1),
  ('Helper / Labour', 'Helper / Labour',  'مددگار / مزدور',    'Loading, shifting, gardening and general help.', 'سامان اٹھانا، شفٹنگ، باغبانی اور عام کام۔', 400, 2500, 2, 1),
  ('Carpenter',  'Carpenter',             'بڑھئی',             'Doors, locks, furniture repair and fitting.', 'دروازے، تالے، فرنیچر کی مرمت اور فٹنگ۔', 800, 4500, 1, 1)
) as v(cat, name_en, name_ur, d_en, d_ur, hr, dr, mh, so)
join public.categories c on c.name_en = v.cat
where not exists (select 1 from public.services);
