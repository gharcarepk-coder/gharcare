-- Live worker tracking (Foodpanda-style).
-- Worker logs in to /worker, taps "On my way", and the app sends GPS every few seconds.
-- The customer sees the status timeline and the worker moving on a map at /track/<booking id>.
-- Location is only stored while a job is active, and is deleted when the job ends.

-- 1. Worker login: link a staff record to an auth user (set by admin via auth-helper).
alter table public.staff add column if not exists user_id uuid unique references auth.users(id) on delete set null;

-- 2. Booking: customer's map pin + time of each step.
alter table public.bookings
  add column if not exists customer_lat double precision check (customer_lat between -90 and 90),
  add column if not exists customer_lng double precision check (customer_lng between -180 and 180),
  add column if not exists on_way_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status = any (array[
  'pending','confirmed','assigned','on_the_way','arrived','in_progress','completed','cancelled']));

-- 3. Latest position of the worker for an active booking (one row per booking).
create table if not exists public.worker_locations (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  heading real,
  speed real,
  accuracy real,
  updated_at timestamptz not null default now()
);
alter table public.worker_locations enable row level security;

create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staff where user_id = auth.uid() and status = 'active' limit 1;
$$;

drop policy if exists "worker_locations read" on public.worker_locations;
create policy "worker_locations read" on public.worker_locations for select using (
  public.is_admin()
  or staff_id = public.current_staff_id()
  or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid())
             and b.status in ('on_the_way','arrived','in_progress'))
);
-- No insert/update/delete policies: writes only go through the functions below.

-- Delete the worker's position as soon as a job ends or the worker is changed.
create or replace function public.clear_worker_location()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('completed','cancelled','pending','confirmed','assigned')
     or new.staff_id is distinct from old.staff_id then
    delete from public.worker_locations where booking_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists clear_worker_location on public.bookings;
create trigger clear_worker_location after update of status, staff_id on public.bookings
  for each row execute function public.clear_worker_location();

-- 4. Worker functions --------------------------------------------------------------
create or replace function public.am_i_worker()
returns text language sql stable security definer set search_path = public as $$
  select full_name from public.staff where user_id = auth.uid() and status = 'active' limit 1;
$$;

create or replace function public.worker_jobs()
returns table(id uuid, ref_no bigint, service_en text, service_ur text, icon text, booking_type text,
  work_date date, start_time time, quantity numeric, workers integer, status text,
  customer_name text, customer_phone text, address text, area_name text, notes text,
  customer_lat double precision, customer_lng double precision)
language sql stable security definer set search_path = public as $$
  select b.id, b.ref_no, s.name_en, s.name_ur, c.icon, b.booking_type, b.work_date, b.start_time,
         b.quantity, b.workers, b.status, b.customer_name, b.customer_phone, b.address, a.name, b.notes,
         b.customer_lat, b.customer_lng
  from public.bookings b
  join public.services s on s.id = b.service_id
  join public.categories c on c.id = s.category_id
  left join public.areas a on a.id = b.area_id
  where b.staff_id = public.current_staff_id()
    and (b.status in ('assigned','on_the_way','arrived','in_progress')
         or (b.status = 'completed' and b.completed_at > now() - interval '12 hours'))
  order by (b.status = 'completed'), b.work_date, b.start_time;
$$;

create or replace function public.worker_set_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_staff_id();
  b public.bookings;
  steps text[] := array['assigned','on_the_way','arrived','in_progress','completed'];
  cur int; nxt int;
  loc public.worker_locations;
begin
  if me is null then raise exception 'Not a GharCare worker'; end if;
  select * into b from public.bookings where id = p_id and staff_id = me for update;
  if b.id is null then raise exception 'Job not found'; end if;
  cur := array_position(steps, b.status);
  nxt := array_position(steps, p_status);
  if cur is null or nxt is null or nxt <= cur then raise exception 'This step is not allowed now'; end if;

  -- When the worker reaches the door and the customer never pinned a location, use the worker's.
  if p_status = 'arrived' and b.customer_lat is null then
    select * into loc from public.worker_locations where booking_id = p_id;
  end if;

  update public.bookings set
    status = p_status,
    on_way_at    = case when p_status = 'on_the_way'  then now() else on_way_at end,
    arrived_at   = case when p_status = 'arrived'     then now() else arrived_at end,
    started_at   = case when p_status = 'in_progress' then now() else started_at end,
    completed_at = case when p_status = 'completed'   then now() else completed_at end,
    customer_lat = coalesce(customer_lat, loc.lat),
    customer_lng = coalesce(customer_lng, loc.lng),
    updated_at = now()
  where id = p_id;
end $$;

create or replace function public.worker_update_location(p_id uuid, p_lat double precision, p_lng double precision,
  p_heading real default null, p_speed real default null, p_accuracy real default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.current_staff_id();
begin
  if me is null then raise exception 'Not a GharCare worker'; end if;
  if not exists (select 1 from public.bookings where id = p_id and staff_id = me
                 and status in ('on_the_way','arrived','in_progress')) then
    raise exception 'Tracking is only on while a job is active';
  end if;
  insert into public.worker_locations as w (booking_id, staff_id, lat, lng, heading, speed, accuracy, updated_at)
  values (p_id, me, p_lat, p_lng, p_heading, p_speed, p_accuracy, now())
  on conflict (booking_id) do update set lat = excluded.lat, lng = excluded.lng, heading = excluded.heading,
    speed = excluded.speed, accuracy = excluded.accuracy, updated_at = now(), staff_id = excluded.staff_id
  where w.updated_at < now() - interval '2 seconds';
end $$;

-- 5. Customer functions ------------------------------------------------------------
create or replace function public.track_booking(p_id uuid)
returns table(id uuid, ref_no bigint, service_en text, service_ur text, icon text, status text,
  work_date date, start_time time, address text, customer_lat double precision, customer_lng double precision,
  created_at timestamptz, confirmed boolean, assigned boolean, on_way_at timestamptz, arrived_at timestamptz,
  started_at timestamptz, completed_at timestamptz, staff_name text, staff_phone text,
  worker_lat double precision, worker_lng double precision, worker_heading real, worker_updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, b.ref_no, s.name_en, s.name_ur, c.icon, b.status, b.work_date, b.start_time, b.address,
         b.customer_lat, b.customer_lng, b.created_at,
         b.status not in ('pending','cancelled'), b.staff_id is not null and b.status not in ('pending','confirmed','cancelled'),
         b.on_way_at, b.arrived_at, b.started_at, b.completed_at,
         case when b.status in ('assigned','on_the_way','arrived','in_progress','completed') then st.full_name end,
         case when b.status in ('assigned','on_the_way','arrived','in_progress') then st.phone end,
         w.lat, w.lng, w.heading, w.updated_at
  from public.bookings b
  join public.services s on s.id = b.service_id
  join public.categories c on c.id = s.category_id
  left join public.staff st on st.id = b.staff_id
  left join public.worker_locations w on w.booking_id = b.id and b.status in ('on_the_way','arrived','in_progress')
  where b.id = p_id and (b.customer_id = auth.uid() or public.is_admin());
$$;

create or replace function public.set_booking_location(p_id uuid, p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.bookings set customer_lat = p_lat, customer_lng = p_lng, updated_at = now()
  where id = p_id and (customer_id = auth.uid() or public.is_admin())
    and status not in ('completed','cancelled');
  if not found then raise exception 'Booking not found'; end if;
end $$;

-- Show the worker's name/phone for the new statuses too.
create or replace function public.my_bookings()
returns table(id uuid, ref_no bigint, service_en text, service_ur text, icon text, booking_type text, work_date date,
  start_time time, quantity numeric, workers integer, est_total integer, final_amount integer, status text,
  address text, staff_name text, staff_phone text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, b.ref_no, s.name_en, s.name_ur, c.icon, b.booking_type, b.work_date,
         b.start_time, b.quantity, b.workers, b.est_total, b.final_amount, b.status,
         b.address,
         case when b.status in ('assigned','on_the_way','arrived','in_progress','completed') then st.full_name end,
         case when b.status in ('assigned','on_the_way','arrived','in_progress') then st.phone end,
         b.created_at
  from public.bookings b
  join public.services s on s.id = b.service_id
  join public.categories c on c.id = s.category_id
  left join public.staff st on st.id = b.staff_id
  where b.customer_id = auth.uid()
  order by b.created_at desc;
$$;

revoke execute on function public.worker_jobs(), public.worker_set_status(uuid, text),
  public.worker_update_location(uuid, double precision, double precision, real, real, real),
  public.track_booking(uuid), public.set_booking_location(uuid, double precision, double precision),
  public.am_i_worker() from anon, public;
grant execute on function public.worker_jobs(), public.worker_set_status(uuid, text),
  public.worker_update_location(uuid, double precision, double precision, real, real, real),
  public.track_booking(uuid), public.set_booking_location(uuid, double precision, double precision),
  public.am_i_worker() to authenticated;

-- 6. Realtime: push status and position changes to the customer's screen instantly.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'worker_locations') then
    alter publication supabase_realtime add table public.worker_locations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bookings') then
    alter publication supabase_realtime add table public.bookings;
  end if;
end $$;

revoke execute on function public.clear_worker_location() from anon, authenticated, public;
