import { NavLink, Navigate, Outlet, Link } from "react-router-dom";
import { useApp } from "../../lib/data";

const links = [
  ["/admin", "📊 Dashboard"],
  ["/admin/bookings", "📋 Bookings"],
  ["/admin/staff", "👷 Staff"],
  ["/admin/services", "🛠️ Services & Rates"],
  ["/admin/areas", "📍 Areas"],
  ["/admin/customers", "👥 Customers"],
  ["/admin/settings", "⚙️ Settings"],
] as const;

export default function AdminLayout() {
  const { profile, authReady, session } = useApp();
  if (!authReady || (session && !profile)) return <div className="section container"><div className="spinner" /></div>;
  if (!session) return <Navigate to="/login?next=/admin" replace />;
  if (profile?.role !== "admin") return <Navigate to="/" replace />;
  return (
    <div className="admin" dir="ltr">
      <aside className="admin-side">
        <Link to="/" className="admin-brand"><img src="/icons/icon-192.png" alt="" width={28} height={28} /> GharCare Admin</Link>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/admin"}>{label}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main"><Outlet /></div>
    </div>
  );
}
