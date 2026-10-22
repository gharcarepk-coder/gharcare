import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Booking, fmtTime, rs, supabase, todayISO, useApp } from "../../lib/data";

export default function Dashboard() {
  const { services } = useApp();
  const [stats, setStats] = useState({ pending: 0, today: 0, staff: 0, customers: 0, month: 0, monthJobs: 0 });
  const [todayList, setTodayList] = useState<Booking[]>([]);
  const [pendingList, setPendingList] = useState<Booking[]>([]);

  useEffect(() => {
    (async () => {
      const today = todayISO();
      const monthStart = today.slice(0, 8) + "01";
      const [p, td, st, cu, mo] = await Promise.all([
        supabase.from("bookings").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
        supabase.from("bookings").select("*").eq("work_date", today).neq("status", "cancelled").order("start_time"),
        supabase.from("staff").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
        supabase.from("bookings").select("est_total,final_amount").eq("status", "completed").gte("work_date", monthStart),
      ]);
      const monthRows = (mo.data || []) as { est_total: number; final_amount: number | null }[];
      setPendingList((p.data as Booking[]) || []);
      setTodayList((td.data as Booking[]) || []);
      const pc = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending");
      setStats({
        pending: pc.count || 0,
        today: td.data?.length || 0,
        staff: st.count || 0,
        customers: cu.count || 0,
        month: monthRows.reduce((s, r) => s + (r.final_amount ?? r.est_total), 0),
        monthJobs: monthRows.length,
      });
    })();
  }, []);

  const svcName = (id: string) => services.find((s) => s.id === id)?.name_en || "Service";

  return (
    <div>
      <h1 className="admin-title">Dashboard</h1>
      <div className="stat-grid">
        <Link to="/admin/bookings?status=pending" className="stat stat-alert"><small>New requests</small><b>{stats.pending}</b></Link>
        <div className="stat"><small>Jobs today</small><b>{stats.today}</b></div>
        <div className="stat"><small>Active staff</small><b>{stats.staff}</b></div>
        <div className="stat"><small>Customers</small><b>{stats.customers}</b></div>
        <div className="stat"><small>Completed this month</small><b>{rs(stats.month)}</b><em>{stats.monthJobs} jobs</em></div>
      </div>

      <div className="admin-cols">
        <div className="panel">
          <h3>New requests — call & confirm</h3>
          {pendingList.length === 0 && <p className="muted">No pending requests.</p>}
          {pendingList.map((b) => (
            <Link key={b.id} to={`/admin/bookings?open=${b.id}`} className="mini-row">
              <b>#{b.ref_no} {svcName(b.service_id)}</b>
              <span>{b.customer_name} · {b.work_date} {fmtTime(b.start_time)}</span>
              <em>{rs(b.est_total)}</em>
            </Link>
          ))}
        </div>
        <div className="panel">
          <h3>Today's jobs</h3>
          {todayList.length === 0 && <p className="muted">No jobs scheduled today.</p>}
          {todayList.map((b) => (
            <Link key={b.id} to={`/admin/bookings?open=${b.id}`} className="mini-row">
              <b>{fmtTime(b.start_time)} · {svcName(b.service_id)}</b>
              <span>{b.customer_name} · {b.workers} worker(s)</span>
              <em className={`pill pill-${b.status}`}>{b.status.replace("_", " ")}</em>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
