import { FormEvent, useEffect, useState } from "react";
import { Area, callAuthHelper, uploadImage, Category, normalizePhone, prettyPhone, Profile, rs, Service, Settings, Staff, supabase, useApp, waLink } from "../../lib/data";

// ======================================================================= Staff
const emptyStaff = { full_name: "", phone: "", cnic: "", category_id: "", area_id: "", daily_wage: 0, status: "active", notes: "" };

export function StaffPage() {
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [edit, setEdit] = useState<(typeof emptyStaff & { id?: string }) | null>(null);
  const [filter, setFilter] = useState("active");
  const [msg, setMsg] = useState("");

  const load = () => supabase.from("staff").select("*").order("full_name").then(({ data }) => setRows((data as Staff[]) || []));
  useEffect(() => {
    load();
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats((data as Category[]) || []));
    supabase.from("areas").select("*").order("name").then(({ data }) => setAreas((data as Area[]) || []));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const p = normalizePhone(edit.phone);
    if (!edit.full_name.trim() || !p) { setMsg("Name and valid mobile number required."); return; }
    const row = {
      full_name: edit.full_name.trim(), phone: "+" + p, cnic: edit.cnic || null,
      category_id: edit.category_id || null, area_id: edit.area_id || null,
      daily_wage: Number(edit.daily_wage) || 0, status: edit.status, notes: edit.notes || null,
    };
    const { error } = edit.id
      ? await supabase.from("staff").update(row).eq("id", edit.id)
      : await supabase.from("staff").insert(row);
    if (error) { setMsg(error.message); return; }
    setEdit(null); setMsg(""); load();
  };

  const catName = (id: string | null) => cats.find((c) => c.id === id);
  const shown = rows?.filter((s) => filter === "all" || s.status === filter);

  return (
    <div>
      <div className="admin-head">
        <h1 className="admin-title">Staff (own manpower)</h1>
        <button className="btn" onClick={() => setEdit({ ...emptyStaff })}>+ Add worker</button>
      </div>
      <div className="chips">
        {["active", "on_leave", "inactive", "all"].map((s) => <button key={s} className={`chip ${filter === s ? "on" : ""}`} onClick={() => setFilter(s)}>{s.replace("_", " ")}</button>)}
      </div>
      {shown === undefined && <div className="spinner" />}
      {shown?.length === 0 && <p className="muted">No workers yet. Add your first worker.</p>}
      <div className="table-wrap">
        {shown && shown.length > 0 && (
          <table className="table">
            <thead><tr><th>Name</th><th>Skill</th><th>Mobile</th><th>CNIC</th><th>Area</th><th>Daily wage</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.full_name}</b></td>
                  <td>{catName(s.category_id)?.icon} {catName(s.category_id)?.name_en}</td>
                  <td><a href={`tel:${s.phone}`}>{prettyPhone(s.phone)}</a> · <a href={waLink(s.phone)} target="_blank" rel="noreferrer">WA</a></td>
                  <td>{s.cnic}</td>
                  <td>{areas.find((a) => a.id === s.area_id)?.name}</td>
                  <td>{rs(s.daily_wage)}</td>
                  <td><em className={`pill pill-${s.status === "active" ? "completed" : s.status === "on_leave" ? "pending" : "cancelled"}`}>{s.status.replace("_", " ")}</em></td>
                  <td><button className="link-btn" onClick={() => setEdit({ ...emptyStaff, ...s, phone: prettyPhone(s.phone), cnic: s.cnic || "", category_id: s.category_id || "", area_id: s.area_id || "", notes: s.notes || "" })}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <div className="drawer-backdrop" onClick={() => setEdit(null)}>
          <form className="drawer form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="drawer-head"><h2>{edit.id ? "Edit worker" : "Add worker"}</h2><button type="button" className="icon-btn" onClick={() => setEdit(null)}>✕</button></div>
            <label className="field"><span>Full name</span><input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} required /></label>
            <label className="field"><span>Mobile</span><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="0300 1234567" inputMode="tel" required /></label>
            <label className="field"><span>CNIC</span><input value={edit.cnic} onChange={(e) => setEdit({ ...edit, cnic: e.target.value })} placeholder="35202-1234567-1" /></label>
            <label className="field"><span>Skill</span>
              <select value={edit.category_id} onChange={(e) => setEdit({ ...edit, category_id: e.target.value })}>
                <option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name_en}</option>)}
              </select></label>
            <label className="field"><span>Area</span>
              <select value={edit.area_id} onChange={(e) => setEdit({ ...edit, area_id: e.target.value })}>
                <option value="">—</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></label>
            <label className="field"><span>Daily wage paid to worker (Rs)</span><input type="number" value={edit.daily_wage} onChange={(e) => setEdit({ ...edit, daily_wage: Number(e.target.value) })} /></label>
            <label className="field"><span>Status</span>
              <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option value="active">Active</option><option value="on_leave">On leave</option><option value="inactive">Inactive</option>
              </select></label>
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
  const rename = async (a: Area, n: string) => { if (n.trim() && n !== a.name) { await supabase.from("areas").update({ name: n.trim() }).eq("id", a.id); load(); refreshCatalog(); } };
  const remove = async (a: Area) => {
    if (!confirm(`Delete area "${a.name}"?`)) return;
    const { error } = await supabase.from("areas").delete().eq("id", a.id);
    if (error) alert("Area is used by bookings — turn it off instead."); else { load(); refreshCatalog(); }
  };

  return (
    <div>
      <h1 className="admin-title">Service areas</h1>
      <p className="muted">Areas / sectors / mohallas in your town that customers can pick when booking.</p>
      <form className="toolbar" onSubmit={add}>
        <input className="search" value={name} onChange={(e) => setName(e.target.value)} placeholder="New area name, e.g. Model Town" />
        <button className="btn">Add area</button>
      </form>
      <div className="area-list">
        {rows.map((a) => (
          <div key={a.id} className={`area-item ${a.is_active ? "" : "off"}`}>
            <input defaultValue={a.name} onBlur={(e) => rename(a, e.target.value)} />
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
