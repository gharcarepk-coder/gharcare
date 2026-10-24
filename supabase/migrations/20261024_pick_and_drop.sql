-- Applied to the live project on 2026-10-24.
-- Pick & drop (worker travel) charge per area, per worker, per working day;
-- included in bookings.est_total and stored in bookings.travel_charge.
alter table public.areas add column if not exists travel_charge int not null default 300 check (travel_charge >= 0);
alter table public.bookings add column if not exists travel_charge int not null default 0 check (travel_charge >= 0);
-- price_booking() now computes:
--   trips = ceil(quantity) for daily bookings, 1 for hourly
--   travel_charge = area.travel_charge * workers * trips
--   est_total = rate * quantity * workers + travel_charge
-- Service rates updated to the verified 24 Oct 2026 rate card (labour only).
