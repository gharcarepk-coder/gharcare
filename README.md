# GharCare (گھر کیئر)

Website + installable mobile web app for GharCare — daily manpower supply (cleaners, plumbers, electricians, mechanics, helpers) on hourly or daily basis.

- **Customer site**: browse services & rates, book hourly/daily, phone + password login, my bookings, English/Urdu.
- **Admin panel** (`/admin`): bookings, assign own staff, staff records, services & rates, areas, customers, settings.
- **PWA**: installable on Android/iPhone home screen.

Stack: React + Vite (Render static site) · Supabase (Postgres, Auth, Edge Function `auth-helper`).

## Develop
```bash
cp .env.example .env   # fill Supabase URL + publishable key
npm install
npm run dev
```
Database: `supabase/schema.sql`. Edge function: `supabase/functions/auth-helper`.
