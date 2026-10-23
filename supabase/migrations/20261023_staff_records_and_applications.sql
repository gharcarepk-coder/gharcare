-- Applied to the live project on 2026-10-23.
-- Extra staff record fields + public worker applications (gharcarepk.com/join).
alter table public.staff
  add column if not exists address text,
  add column if not exists emergency_name text,
  add column if not exists emergency_phone text,
  add column if not exists wage_method text,
  add column if not exists cnic_verified boolean not null default false,
  add column if not exists police_verified boolean not null default false,
  add column if not exists experience text,
  add column if not exists source text not null default 'admin';

alter table public.staff drop constraint if exists staff_status_check;
alter table public.staff add constraint staff_status_check
  check (status in ('applied','active','on_leave','inactive','rejected'));
alter table public.staff add constraint staff_wage_method_check
  check (wage_method is null or wage_method in ('jazzcash','easypaisa','bank','cash'));
alter table public.staff add constraint staff_source_check check (source in ('admin','website'));

-- See the live database for the body of public.submit_worker_application(...):
-- validates name / +923XXXXXXXXX mobile / CNIC format, blocks duplicate mobiles and floods,
-- inserts with status 'applied', source 'website'. Executable by anon + authenticated.
