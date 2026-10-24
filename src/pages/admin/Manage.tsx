import { FormEvent, useEffect, useState } from "react";
import { Area, callAuthHelper, uploadImage, Category, normalizePhone, prettyPhone, Profile, rs, Service, Settings, Staff, supabase, useApp, waLink } from "../../lib/data";

// ======================================================================= Staff
const emptyStaff = {
  full_name: "", phone: "", cnic: "", category_id: "", area_id: "", daily_wage: 0, status: "active", notes: "",
  address: "", emergency_name: "", emergency_phone: "", wage_method: "", cnic_verified: false, police_verified: false,
  experience: "", joined_on: "",
};
const STAFF_TABS: [string, string][] = [
  ["applied", "New applications"], ["active", "Active"], ["on_leave", "On leave"], ["inactive", "Inactive"], ["rejected", "Rejected"], ["all", "All"],
];
const statusPill = (s: string) => ({ active: "completed", on_leave: "pending", applied: "assigned", inactive: "cancelled", rejected: "cancelled" } as Record<string, string>)[s] || "pending";
const todayLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function StaffPage() {
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [edit, setEdit] = useState<(typeof emptyStaff & { id?: string; source?: string }) | null>(null);
  const [filter, setFilter] = useState("active");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => supabase.from("staff").select("*").order("created_at", { ascending: false }).then(({ data }) => {
    const list = (data as Staff[]) || [];
    setRows(list);
    return list;
  });
  useEffect(() => {
    load().then((list) => { if (list.some((s) => s.status === "applied")) setFilter("applied"); });
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats((data as Category[]) || []));
    supabase.from("areas").select("*").order("name").then(({ data }) => setAreas((data as Area[]) || []));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const p = normalizePhone(edit.phone);
    if (!edit.full_name.trim() || !p) { setMsg("Name and valid mobile number required."); return; }
    const ep = edit.emergency_phone ? normalizePhone(edit.emergency_phone) : null;
    if (edit.emergency_phone && !ep) { setMsg("Emergency mobile number is not valid."); return; }
    const row = {
      full_name: edit.full_name.trim(), phone: "+" + p, cnic: edit.cnic || null,
      category_id: edit.category_id || null, area_id: edit.area_id || null,
      daily_wage: Number(edit.daily_wage) || 0, status: edit.status, notes: edit.notes || null,
      address: edit.address || null, emergency_name: edit.emergency_name || null, emergency_phone: ep ? "+" + ep : null,
      wage_method: edit.wage_method || null, cnic_verified: edit.cnic_verified, police_verified: edit.police_verified,
      experience: edit.experience || null, joined_on: edit.joined_on || todayLocal(),
    };
    const { error } = edit.id
      ? await supabase.from("staff").update(row).eq("id", edit.id)
      : await supabase.from("staff").insert(row);
    if (error) { setMsg(error.message); return; }
    setEdit(null); setMsg(""); load();
  };

  const setStatus = async (s: Staff, status: string) => {
    const patch: Record<string, unknown> = { status };
    if (s.status === "applied" && status === "active") patch.joined_on = todayLocal();
    const { error } = await supabase.from("staff").update(patch).eq("id", s.id);
    if (error) { alert(error.message); return; }
    load();
  };

  const catName = (id: string | null) => cats.find((c) => c.id === id);
  const areaName = (id: string | null) => areas.find((a) => a.id === id)?.name || "";
  const count = (st: string) => rows?.filter((s) => st === "all" || s.status === st).length ?? 0;
  const needle = q.trim().toLowerCase();
  const shown = rows?.filter((s) => (filter === "all" || s.status === filter) &&
    (!needle || [s.full_name, s.phone, s.cnic, s.address].some((v) => (v || "").toLowerCase().includes(needle))));

  const exportCsv = () => {
    if (!rows) return;
    const head = ["Name", "Mobile", "CNIC", "Skill", "Area", "Address", "Experience", "Emergency contact", "Emergency mobile",
      "Daily wage (Rs)", "Wage paid by", "Status", "Joining date", "CNIC verified", "Police verification", "Source", "Notes", "Added on"];
    const lines = (shown || []).map((s) => [s.full_name, prettyPhone(s.phone), s.cnic, catName(s.category_id)?.name_en, areaName(s.area_id),
      s.address, s.experience, s.emergency_name, s.emergency_phone ? prettyPhone(s.emergency_phone) : "", s.daily_wage, s.wage_method,
      s.status.replace("_", " "), s.joined_on, s.cnic_verified ? "Yes" : "No", s.police_verified ? "Yes" : "No", s.source, s.notes,
      s.created_at.slice(0, 10)].map(csvCell).join(","));
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gharcare-staff-${todayLocal()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openEdit = (s: Staff) => setEdit({
    ...emptyStaff, ...s, phone: prettyPhone(s.phone), cnic: s.cnic || "", category_id: s.category_id || "", area_id: s.area_id || "",
    notes: s.notes || "", address: s.address || "", emergency_name: s.emergency_name || "",
    emergency_phone: s.emergency_phone ? prettyPhone(s.emergency_phone) : "", wage_method: s.wage_method || "",
    experience: s.experience || "", joined_on: s.joined_on || "",
  });

  return (
    <div>
      <div className="admin-head">
        <h1 className="admin-title">Staff (own manpower)</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={exportCsv} disabled={!shown?.length}>⬇ Download Excel (CSV)</button>
          <button className="btn" onClick={() => setEdit({ ...emptyStaff, joined_on: todayLocal() })}>+ Add worker</button>
        </div>
      </div>
      <p className="muted small">New workers who apply on the website (gharcarepk.com/join) appear under <b>New applications</b>. Approve them to move them into Active staff.</p>
      <div className="chips">
        {STAFF_TABS.map(([s, label]) => (
          <button key={s} className={`chip ${filter === s ? "on" : ""}`} onClick={() => setFilter(s)}>
            {label}{rows ? ` (${count(s)})` : ""}
          </button>
        ))}
      </div>
      <input className="search" placeholder="Search name, mobile, CNIC or address" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 360, marginBottom: 12 }} />
      {shown === undefined && <div className="spinner" />}
      {shown?.length === 0 && <p className="muted">{filter === "applied" ? "No new applications. Share gharcarepk.com/join with people who want to work with GharCare." : "No workers here yet."}</p>}
      <div className="table-wrap">
        {shown && shown.length > 0 && (
          <table className="table">
            <thead><tr><th>Name</th><th>Skill</th><th>Mobile</th><th>CNIC</th><th>Area</th><th>Daily wage</th><th>Checks</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.full_name}</b>{s.source === "website" && <><br /><small className="muted">Applied {s.created_at.slice(0, 10)}</small></>}</td>
                  <td>{catName(s.category_id)?.icon} {catName(s.category_id)?.name_en}</td>
                  <td><a href={`tel:${s.phone}`}>{prettyPhone(s.phone)}</a> · <a href={waLink(s.phone)} target="_blank" rel="noreferrer">WA</a></td>
                  <td>{s.cnic}</td>
                  <td>{areaName(s.area_id)}</td>
                  <td>{s.daily_wage ? rs(s.daily_wage) : "—"}</td>
                  <td><small>{s.cnic_verified ? "✅" : "⬜"} CNIC<br />{s.police_verified ? "✅" : "⬜"} Police</small></td>
                  <td><em className={`pill pill-${statusPill(s.status)}`}>{s.status === "applied" ? "new" : s.status.replace("_", " ")}</em></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {s.status === "applied" && <>
                      <button className="link-btn" onClick={() => setStatus(s, "active")}>Approve</button>{" · "}
                      <button className="link-btn" onClick={() => setStatus(s, "rejected")}>Reject</button>{" · "}
                    </>}
                    <button className="link-btn" onClick={() => openEdit(s)}>{s.status === "applied" ? "View" : "Edit"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <div className="drawer-backdrop" onClick={() => setEdit(null)}>
          <form className="drawer form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="drawer-head"><h2>{edit.id ? (edit.status === "applied" ? "Application" : "Edit worker") : "Add worker"}</h2><button type="button" className="icon-btn" onClick={() => setEdit(null)}>✕</button></div>
            <label className="field"><span>Full name</span><input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} required /></label>
            <div className="row2">
              <label className="field"><span>Mobile</span><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="0300 1234567" inputMode="tel" required /></label>
              <label className="field"><span>CNIC</span><input value={edit.cnic} onChange={(e) => setEdit({ ...edit, cnic: e.target.value })} placeholder="35202-1234567-1" /></label>
            </div>
            <div className="row2">
              <label className="field"><span>Skill</span>
                <select value={edit.category_id} onChange={(e) => setEdit({ ...edit, category_id: e.target.value })}>
                  <option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name_en}</option>)}
                </select></label>
              <label className="field"><span>Area</span>
                <select value={edit.area_id} onChange={(e) => setEdit({ ...edit, area_id: e.target.value })}>
                  <option value="">—</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></label>
            </div>
            <label className="field"><span>Home address</span><textarea rows={2} value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></label>
            <label className="field"><span>Experience</span><textarea rows={2} value={edit.experience} onChange={(e) => setEdit({ ...edit, experience: e.target.value })} /></label>
            <div className="row2">
              <label className="field"><span>Emergency contact</span><input value={edit.emergency_name} onChange={(e) => setEdit({ ...edit, emergency_name: e.target.value })} /></label>
              <label className="field"><span>Emergency mobile</span><input value={edit.emergency_phone} onChange={(e) => setEdit({ ...edit, emergency_phone: e.target.value })} placeholder="0300 1234567" inputMode="tel" /></label>
            </div>
            <div className="row2">
              <label className="field"><span>Daily wage paid to worker (Rs)</span><input type="number" min={0} value={edit.daily_wage} onChange={(e) => setEdit({ ...edit, daily_wage: Number(e.target.value) })} /></label>
              <label className="field"><span>Wage paid by</span>
                <select value={edit.wage_method} onChange={(e) => setEdit({ ...edit, wage_method: e.target.value })}>
                  <option value="">—</option><option value="jazzcash">JazzCash</option><option value="easypaisa">Easypaisa</option><option value="bank">Bank</option><option value="cash">Cash</option>
                </select></label>
            </div>
            <div className="row2">
              <label className="field"><span>Status</span>
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  <option value="applied">New application</option><option value="active">Active</option><option value="on_leave">On leave</option>
                  <option value="inactive">Inactive</option><option value="rejected">Rejected</option>
                </select></label>
              <label className="field"><span>Joining date</span><input type="date" value={edit.joined_on} onChange={(e) => setEdit({ ...edit, joined_on: e.target.value })} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={edit.cnic_verified} onChange={(e) => setEdit({ ...edit, cnic_verified: e.target.checked })} /> CNIC verified</label>
            <label className="check"><input type="checkbox" checked={edit.police_verified} onChange={(e) => setEdit({ ...edit, police_verified: e.target.checked })} /> Police verification done</label>
            <label className="field"><span>Notes</span><textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
            {msg && <p className="error">{msg}</p>}
            <button className="btn btn-block">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ======================================================================= Image picker
function ImagePick({ url, folder, onChange, size = 56 }: { url: string | null; folder: string; onChange: (u: string | null) => void; size?: number }) {
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadImage(f, folder)); } catch (e) { alert((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="img-pick" style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" /> : <span>{busy ? "…" : "📷"}</span>}
      <label title="Upload picture">
        <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} hidden />
      </label>
      {url && <button type="button" className="img-x" title="Remove picture" onClick={() => onChange(null)}>✕</button>}
    </div>
  );
}

// ======================================================================= Services
export function ServicesPage() {
  const { refreshCatalog } = useApp();
  const [cats, setCats] = useState<Category[]>([]);
  const [svcs, setSvcs] = useState<Service[]>([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [c, s] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order"),
    ]);
    setCats((c.data as Category[]) || []);
    setSvcs((s.data as Service[]) || []);
  };
  useEffect(() => { load(); }, []);

  const upd = (id: string, patch: Partial<Service>) => setSvcs((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updCat = (id: string, patch: Partial<Category>) => setCats((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const saveAll = async () => {
    setMsg("Saving…");
    for (const c of cats) {
      const { id, ...rest } = c;
      const { error } = await supabase.from("categories").update(rest).eq("id", id);
      if (error) { setMsg(error.message); return; }
    }
    for (const s of svcs) {
      const { id, ...rest } = s;
      const { error } = await supabase.from("services").update(rest).eq("id", id);
      if (error) { setMsg(error.message); return; }
    }
    setMsg("Saved ✓");
    refreshCatalog();
  };
  const addCat = async () => {
    const { error } = await supabase.from("categories").insert({ name_en: "New category", name_ur: "نئی کیٹیگری", icon: "🛠️", sort_order: cats.length + 1 });
    if (error) setMsg(error.message); else load();
  };
  const addSvc = async (catId: string) => {
    const { error } = await supabase.from("services").insert({ category_id: catId, name_en: "New service", name_ur: "نئی سروس", hourly_rate: 500, daily_rate: 3000, sort_order: 99 });
    if (error) setMsg(error.message); else load();
  };

  return (
    <div>
      <div className="admin-head">
        <div><h1 className="admin-title">Services & Rates</h1><p className="muted small">Click 📷 to upload a picture. Edit names (English / اردو), rates, then press Save all changes.</p></div>
        <div className="btn-row"><button className="btn btn-ghost" onClick={addCat}>+ Category</button><button className="btn" onClick={saveAll}>Save all changes</button></div>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {cats.map((c) => (
        <div key={c.id} className="panel svc-admin">
          <div className="svc-admin-cat">
            <ImagePick url={c.image_url} folder="categories" onChange={(u) => updCat(c.id, { image_url: u })} size={64} />
            <input className="icon-input" value={c.icon} onChange={(e) => updCat(c.id, { icon: e.target.value })} aria-label="Icon" title="Emoji shown if no picture" />
            <input value={c.name_en} onChange={(e) => updCat(c.id, { name_en: e.target.value })} aria-label="Category English" />
            <input value={c.name_ur} onChange={(e) => updCat(c.id, { name_ur: e.target.value })} dir="rtl" aria-label="Category Urdu" />
            <input type="number" className="w-num" value={c.sort_order} onChange={(e) => updCat(c.id, { sort_order: Number(e.target.value) })} title="Order" />
            <label className="toggle"><input type="checkbox" checked={c.is_active} onChange={(e) => updCat(c.id, { is_active: e.target.checked })} /> Active</label>
          </div>
          <div className="table-wrap">
            <table className="table compact">
              <thead><tr><th>Pic</th><th>Service (EN)</th><th>Service (UR)</th><th>Description (EN)</th><th>Description (UR)</th><th>Rs / hour</th><th>Rs / day</th><th>Min hrs</th><th>On</th></tr></thead>
              <tbody>
                {svcs.filter((s) => s.category_id === c.id).map((s) => (
                  <tr key={s.id}>
                    <td><ImagePick url={s.image_url} folder="services" onChange={(u) => upd(s.id, { image_url: u })} size={44} /></td>
                    <td><input value={s.name_en} onChange={(e) => upd(s.id, { name_en: e.target.value })} /></td>
                    <td><input value={s.name_ur} dir="rtl" onChange={(e) => upd(s.id, { name_ur: e.target.value })} /></td>
                    <td><input value={s.description_en} onChange={(e) => upd(s.id, { description_en: e.target.value })} /></td>
                    <td><input value={s.description_ur} dir="rtl" onChange={(e) => upd(s.id, { description_ur: e.target.value })} /></td>
                    <td><input type="number" className="w-num" value={s.hourly_rate} onChange={(e) => upd(s.id, { hourly_rate: Number(e.target.value) })} /></td>
                    <td><input type="number" className="w-num" value={s.daily_rate} onChange={(e) => upd(s.id, { daily_rate: Number(e.target.value) })} /></td>
                    <td><input type="number" className="w-num" value={s.min_hours} onChange={(e) => upd(s.id, { min_hours: Number(e.target.value) })} /></td>
                    <td><input type="checkbox" checked={s.is_active} onChange={(e) => upd(s.id, { is_active: e.target.checked })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="link-btn" onClick={() => addSvc(c.id)}>+ Add service</button>
        </div>
      ))}
    </div>
  );
}

// ======================================================================= Areas
export function AreasPage() {
  const { refreshCatalog } = useApp();
  const [rows, setRows] = useState<Area[]>([]);
  const [name, setName] = useState("");
  const load = () => supabase.from("areas").select("*").order("sort_order").order("name").then(({ data }) => setRows((data as Area[]) || []));
  useEffect(() => { load(); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await supabase.from("areas").insert({ name: n });
    setName(""); load(); refreshCatalog();
  };
  const toggle = async (a: Area) => { await supabase.from("areas").update({ is_active: !a.is_active }).eq("id", a.id); load(); refreshCatalog(); };
  const setCharge = async (a: Area, v: string) => {
    const n = Math.max(0, Math.round(Number(v) || 0));
    if (n !== a.travel_charge) { await supabase.from("areas").update({ travel_charge: n }).eq("id", a.id); load(); refreshCatalog(); }
  };
  const rename = async (a: Area, n: string) => { if (n.trim() && n !== a.name) { await supabase.from("areas").update({ name: n.trim() }).eq("id", a.id); load(); refreshCatalog(); } };
  const remove = async (a: Area) => {
    if (!confirm(`Delete area "${a.name}"?`)) return;
    const { error } = await supabase.from("areas").delete().eq("id", a.id);
    if (error) alert("Area is used by bookings — turn it off instead."); else { load(); refreshCatalog(); }
  };

  return (
    <div>
      <h1 className="admin-title">Service areas</h1>
      <p className="muted">Areas / sectors / mohallas in your town that customers can pick when booking. <b>Pick &amp; drop</b> is the worker travel charge for that area, added per worker for each working day.</p>
      <form className="toolbar" onSubmit={add}>
        <input className="search" value={name} onChange={(e) => setName(e.target.value)} placeholder="New area name, e.g. Model Town" />
        <button className="btn">Add area</button>
      </form>
      <div className="area-list">
        {rows.map((a) => (
          <div key={a.id} className={`area-item ${a.is_active ? "" : "off"}`}>
            <input defaultValue={a.name} onBlur={(e) => rename(a, e.target.value)} />
            <label className="toggle" title="Pick & drop charge per worker per day">🛵 Rs
              <input type="number" min={0} step={50} defaultValue={a.travel_charge} onBlur={(e) => setCharge(a, e.target.value)} style={{ width: 90, flex: "none" }} aria-label={`Pick and drop charge for ${a.name}`} />
            </label>
            <label className="toggle"><input type="checkbox" checked={a.is_active} onChange={() => toggle(a)} /> Active</label>
            <button className="link-btn danger" onClick={() => remove(a)}>Delete</button>
          </div>
        ))}
        {rows.length === 0 && <p className="muted">No areas yet. Customers will just type their address.</p>}
      </div>
    </div>
  );
}

// ======================================================================= Customers
export function CustomersPage() {
  const [rows, setRows] = useState<(Profile & { count: number })[] | null>(null);
  const [q, setQ] = useState("");
  const [reset, setReset] = useState<Profile | null>(null);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const [p, b] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("customer_id"),
      ]);
      const counts = new Map<string, number>();
      (b.data || []).forEach((r: { customer_id: string }) => counts.set(r.customer_id, (counts.get(r.customer_id) || 0) + 1));
      setRows(((p.data as Profile[]) || []).map((x) => ({ ...x, count: counts.get(x.id) || 0 })));
    })();
  }, []);

  const doReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!reset?.phone || pw.length < 6) { setMsg("Password must be 6+ characters."); return; }
    try {
      await callAuthHelper({ action: "reset_password", phone: reset.phone, password: pw });
      setMsg(`Password reset. Send it to ${reset.full_name} on WhatsApp.`);
    } catch (ex) { setMsg("Error: " + (ex as Error).message); }
  };

  const shown = rows?.filter((r) => `${r.full_name} ${r.phone}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <h1 className="admin-title">Customers</h1>
      <input className="search" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      {!rows && <div className="spinner" />}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Mobile</th><th>Role</th><th>Bookings</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {shown?.map((r) => (
              <tr key={r.id}>
                <td><b>{r.full_name}</b></td>
                <td><a href={`tel:${r.phone}`}>{prettyPhone(r.phone)}</a> · <a href={waLink(r.phone || "")} target="_blank" rel="noreferrer">WA</a></td>
                <td>{r.role}</td>
                <td>{r.count}</td>
                <td>{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
                <td><button className="link-btn" onClick={() => { setReset(r); setPw(""); setMsg(""); }}>Reset password</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reset && (
        <div className="drawer-backdrop" onClick={() => setReset(null)}>
          <form className="drawer form" onClick={(e) => e.stopPropagation()} onSubmit={doReset}>
            <div className="drawer-head"><h2>Reset password</h2><button type="button" className="icon-btn" onClick={() => setReset(null)}>✕</button></div>
            <p>{reset.full_name} · {prettyPhone(reset.phone)}</p>
            <label className="field"><span>New password</span><input value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            {msg && <p className="ok">{msg}</p>}
            <button className="btn btn-block">Set password</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ======================================================================= Settings
export function SettingsPage() {
  const { refreshCatalog } = useApp();
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { supabase.from("settings").select("*").eq("id", 1).single().then(({ data }) => setS(data as Settings)); }, []);
  if (!s) return <div className="spinner" />;
  const f = (k: keyof Settings, label: string, opts: { dir?: "rtl"; area?: boolean } = {}) => (
    <label className="field"><span>{label}</span>
      {opts.area
        ? <textarea rows={2} dir={opts.dir} value={String(s[k] ?? "")} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
        : <input dir={opts.dir} value={String(s[k] ?? "")} onChange={(e) => setS({ ...s, [k]: e.target.value })} />}
    </label>
  );
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const { id, ...rest } = s;
    const { error } = await supabase.from("settings").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    setMsg(error ? error.message : "Saved ✓");
    refreshCatalog();
  };
  return (
    <div>
      <h1 className="admin-title">Settings</h1>
      <form className="panel form narrow" onSubmit={save}>
        <div className="field">
          <span>Logo (shown on website header & footer) — click to upload, then Save</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ImagePick url={s.logo_url || "/brand-logo.webp"} folder="brand" onChange={(u) => setS({ ...s, logo_url: u })} size={120} />
            {s.logo_url && <button type="button" className="link-btn" onClick={() => setS({ ...s, logo_url: null })}>Use default logo</button>}
          </div>
        </div>
        <label className="toggle" style={{ fontSize: "1rem" }}>
          <input type="checkbox" checked={!!s.show_prices} onChange={(e) => setS({ ...s, show_prices: e.target.checked })} />
          Show prices on home & services pages (off = prices only appear on the booking form)
        </label>
        {f("town", "Town / city served (shown in footer)")}
        {f("phone", "Phone (+92…)")}
        {f("whatsapp", "WhatsApp (+92…)")}
        {f("email", "Email")}
        {f("hours_text", "Working hours")}
        {f("announcement_en", "Top banner (English) — leave empty to hide", { area: true })}
        {f("announcement_ur", "Top banner (Urdu)", { area: true, dir: "rtl" })}
        {msg && <p className="ok">{msg}</p>}
        <button className="btn">Save</button>
      </form>
    </div>
  );
}

// ======================================================================= Banners
type BannerRow = { id?: string; image_url: string; title_en: string; title_ur: string; subtitle_en: string; subtitle_ur: string; link: string; sort_order: number; is_active: boolean };

export function BannersPage() {
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [msg, setMsg] = useState("");
  const load = () => supabase.from("banners").select("*").order("sort_order").then(({ data }) => setRows((data as BannerRow[]) || []));
  useEffect(() => { load(); }, []);

  const add = async (file?: File) => {
    if (!file) return;
    setMsg("Uploading…");
    try {
      const url = await uploadImage(file, "banners");
      const { error } = await supabase.from("banners").insert({ image_url: url, sort_order: rows.length + 1 });
      setMsg(error ? error.message : "Banner added ✓ — add a title if you like, then Save");
      load();
    } catch (e) { setMsg((e as Error).message); }
  };
  const upd = (n: number, patch: Partial<BannerRow>) => setRows((p) => p.map((r, k) => (k === n ? { ...r, ...patch } : r)));
  const saveAll = async () => {
    setMsg("Saving…");
    for (const r of rows) {
      const { id, ...rest } = r;
      const { error } = await supabase.from("banners").update(rest).eq("id", id!);
      if (error) { setMsg(error.message); return; }
    }
    setMsg("Saved ✓");
  };
  const remove = async (r: BannerRow) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("banners").delete().eq("id", r.id!);
    load();
  };

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Home banners</h1>
          <p className="muted small">Wide images (best 1600 × 600). They slide automatically at the top of the home page.</p>
        </div>
        <div className="btn-row">
          <label className="btn btn-ghost" style={{ cursor: "pointer" }}>+ Add banner<input type="file" accept="image/*" hidden onChange={(e) => add(e.target.files?.[0])} /></label>
          <button className="btn" onClick={saveAll}>Save all changes</button>
        </div>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {rows.length === 0 && <p className="muted">No banners yet. Click “+ Add banner”.</p>}
      <div className="banner-admin">
        {rows.map((r, n) => (
          <div key={r.id} className={`panel banner-admin-item ${r.is_active ? "" : "off"}`}>
            <img src={r.image_url} alt="" />
            <div className="form">
              <div className="row2">
                <label className="field"><span>Title (English)</span><input value={r.title_en} onChange={(e) => upd(n, { title_en: e.target.value })} placeholder="e.g. Eid deep cleaning offer" /></label>
                <label className="field"><span>Title (اردو)</span><input dir="rtl" value={r.title_ur} onChange={(e) => upd(n, { title_ur: e.target.value })} /></label>
              </div>
              <div className="row2">
                <label className="field"><span>Subtitle (English)</span><input value={r.subtitle_en} onChange={(e) => upd(n, { subtitle_en: e.target.value })} /></label>
                <label className="field"><span>Subtitle (اردو)</span><input dir="rtl" value={r.subtitle_ur} onChange={(e) => upd(n, { subtitle_ur: e.target.value })} /></label>
              </div>
              <div className="row2">
                <label className="field"><span>Opens when clicked</span><input value={r.link} onChange={(e) => upd(n, { link: e.target.value })} placeholder="/book" /></label>
                <label className="field"><span>Order</span><input type="number" value={r.sort_order} onChange={(e) => upd(n, { sort_order: Number(e.target.value) })} /></label>
              </div>
              <div className="btn-row">
                <label className="toggle"><input type="checkbox" checked={r.is_active} onChange={(e) => upd(n, { is_active: e.target.checked })} /> Show on website</label>
                <button className="link-btn danger" onClick={() => remove(r)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
