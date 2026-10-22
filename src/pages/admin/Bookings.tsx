import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Area, Booking, BookingStatus, fmtDate, fmtTime, prettyPhone, rs, Service, Staff, STATUSES, supabase, waLink } from "../../lib/data";

export default function Bookings() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const status = params.get("status") || "active";
  const [q, setQ] = useState("");
  const openId = params.get("open");

  const load = async () => {
    let query = supabase.from("bookings").select("*").order("work_date", { ascending: status === "active" }).order("start_time").limit(300);
    if (status === "active") query = query.in("status", ["pending", "confirmed", "assigned", "in_progress"]);
    else if (status !== "all") query = query.eq("status", status);
    const { data } = await query;
    setRows((data as Booking[]) || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => {
    supabase.from("services").select("*").order("sort_order").then(({ data }) => setServices((data as Service[]) || []));
    supabase.from("staff").select("*").order("full_name").then(({ data }) => setStaff((data as Staff[]) || []));
    supabase.from("areas").select("*").order("name").then(({ data }) => setAreas((data as Area[]) || []));
  }, []);

  const svc = (id: string) => services.find((s) => s.id === id);
  const areaName = (id: string | null) => areas.find((a) => a.id === id)?.name || "";
  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.full_name || "";

  const filtered = useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((b) => `${b.ref_no} ${b.customer_name} ${b.customer_phone} ${b.address}`.toLowerCase().includes(s));
  }, [rows, q]);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };

  const open = rows?.find((b) => b.id === openId) || null;

  return (
    <div>
      <h1 className="admin-title">Bookings</h1>
      <div className="toolbar">
        <div className="chips">
          {["active", ...STATUSES, "all"].map((s) => (
            <button key={s} className={`chip ${status === s ? "on" : ""}`} onClick={() => setParam("status", s)}>{s.replace("_", " ")}</button>
          ))}
        </div>
        <input className="search" placeholder="Search name, phone, #ref, address" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered === null && <div className="spinner" />}
      {filtered?.length === 0 && <p className="muted">No bookings.</p>}
      <div className="table-wrap">
        {filtered && filtered.length > 0 && (
          <table className="table">
            <thead><tr><th>#</th><th>When</th><th>Service</th><th>Customer</th><th>Area</th><th>Qty</th><th>Amount</th><th>Worker</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} onClick={() => setParam("open", b.id)} className="clickable">
                  <td>{b.ref_no}</td>
                  <td>{b.work_date}<br /><small>{fmtTime(b.start_time)}</small></td>
                  <td>{svc(b.service_id)?.name_en}</td>
                  <td>{b.customer_name}<br /><small>{prettyPhone(b.customer_phone)}</small></td>
                  <td>{areaName(b.area_id)}</td>
                  <td>{b.quantity}{b.booking_type === "hourly" ? "h" : "d"} × {b.workers}</td>
                  <td>{rs(b.final_amount ?? b.est_total)}</td>
                  <td>{staffName(b.staff_id) || <span className="muted">—</span>}</td>
                  <td><em className={`pill pill-${b.status}`}>{b.status.replace("_", " ")}</em></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <BookingDrawer
          key={open.id}
          b={open}
          service={svc(open.service_id)}
          area={areaName(open.area_id)}
          staff={staff}
          onClose={() => setParam("open", null)}
          onSaved={() => { load(); }}
        />
      )}
    </div>
  );
}

function BookingDrawer({ b, service, area, staff, onClose, onSaved }: {
  b: Booking; service?: Service; area: string; staff: Staff[]; onClose: () => void; onSaved: () => void;
}) {
  const [status, setStatus] = useState<BookingStatus>(b.status);
  const [staffId, setStaffId] = useState(b.staff_id || "");
  const [finalAmt, setFinalAmt] = useState(b.final_amount?.toString() || "");
  const [notes, setNotes] = useState(b.admin_notes || "");
  const [msg, setMsg] = useState("");

  const suitable = staff.filter((s) => s.status === "active" && (!service || s.category_id === service.category_id));
  const others = staff.filter((s) => s.status === "active" && !suitable.includes(s));
  const worker = staff.find((s) => s.id === staffId);

  const save = async () => {
    setMsg("Saving…");
    let st = status;
    if (staffId && (st === "pending" || st === "confirmed")) st = "assigned";
    const { error } = await supabase.from("bookings").update({
      status: st, staff_id: staffId || null, final_amount: finalAmt ? Number(finalAmt) : null, admin_notes: notes || null,
    }).eq("id", b.id);
    if (error) { setMsg("Error: " + error.message); return; }
    setStatus(st);
    setMsg("Saved ✓");
    onSaved();
  };

  const jobText = `GharCare Job #${b.ref_no}\n${service?.name_en}\n${fmtDate(b.work_date)} at ${fmtTime(b.start_time)}\n${b.quantity} ${b.booking_type === "hourly" ? "hours" : "days"} × ${b.workers} worker(s)\nCustomer: ${b.customer_name} ${prettyPhone(b.customer_phone)}\nAddress: ${b.address}${area ? ", " + area : ""}${b.notes ? `\nWork: ${b.notes}` : ""}`;
  const custText = `Assalam o Alaikum ${b.customer_name}, your GharCare booking #${b.ref_no} (${service?.name_en}) on ${fmtDate(b.work_date)} at ${fmtTime(b.start_time)} is confirmed.${worker ? ` Your worker: ${worker.full_name} ${prettyPhone(worker.phone)}.` : ""} Estimated: ${rs(b.est_total)}. Thank you!`;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Booking #{b.ref_no}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <dl className="dl">
          <dt>Service</dt><dd>{service?.name_en}</dd>
          <dt>When</dt><dd>{fmtDate(b.work_date)} · {fmtTime(b.start_time)}</dd>
          <dt>Duration</dt><dd>{b.quantity} {b.booking_type === "hourly" ? "hours" : "days"} × {b.workers} worker(s)</dd>
          <dt>Estimate</dt><dd>{rs(b.rate)} × {b.quantity} × {b.workers} = <b>{rs(b.est_total)}</b></dd>
          <dt>Customer</dt><dd>{b.customer_name} · <a href={`tel:${b.customer_phone}`}>{prettyPhone(b.customer_phone)}</a></dd>
          <dt>Address</dt><dd>{b.address}{area && `, ${area}`}</dd>
          {b.notes && (<><dt>Customer notes</dt><dd>{b.notes}</dd></>)}
          <dt>Booked</dt><dd>{new Date(b.created_at).toLocaleString("en-GB")}</dd>
        </dl>
        <div className="btn-row">
          <a className="btn btn-sm btn-ghost" href={`tel:${b.customer_phone}`}>📞 Call customer</a>
          <a className="btn btn-sm btn-ghost" href={waLink(b.customer_phone, custText)} target="_blank" rel="noreferrer">💬 WhatsApp customer</a>
        </div>

        <div className="form">
          <label className="field"><span>Assign worker</span>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">— Not assigned —</option>
              {suitable.length > 0 && <optgroup label="Matching skill">{suitable.map((s) => <option key={s.id} value={s.id}>{s.full_name} · {prettyPhone(s.phone)}</option>)}</optgroup>}
              {others.length > 0 && <optgroup label="Other active staff">{others.map((s) => <option key={s.id} value={s.id}>{s.full_name} · {prettyPhone(s.phone)}</option>)}</optgroup>}
            </select>
          </label>
          {worker && (
            <a className="btn btn-sm btn-ghost" href={waLink(worker.phone, jobText)} target="_blank" rel="noreferrer">💬 Send job to {worker.full_name}</a>
          )}
          <label className="field"><span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </label>
          <label className="field"><span>Final amount collected (Rs)</span>
            <input type="number" inputMode="numeric" value={finalAmt} onChange={(e) => setFinalAmt(e.target.value)} placeholder={String(b.est_total)} />
          </label>
          <label className="field"><span>Internal notes</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button className="btn btn-block" onClick={save}>Save</button>
          {msg && <p className="ok">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
