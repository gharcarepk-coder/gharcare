import { createClient, Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

// ---------------------------------------------------------------- types
export type Category = { id: string; name_en: string; name_ur: string; icon: string; image_url: string | null; sort_order: number; is_active: boolean };
export type Service = {
  id: string; category_id: string; name_en: string; name_ur: string; description_en: string; description_ur: string;
  hourly_rate: number; daily_rate: number; min_hours: number; sort_order: number; is_active: boolean; image_url: string | null;
};
export type Area = { id: string; name: string; sort_order: number; is_active: boolean };
export type Settings = {
  id: number; business_name: string; town: string; phone: string; whatsapp: string; email: string;
  hours_text: string; announcement_en: string; announcement_ur: string; logo_url: string | null; show_prices: boolean;
};
export type Profile = { id: string; full_name: string; phone: string | null; role: "customer" | "admin"; created_at: string };
export type Staff = {
  id: string; full_name: string; phone: string; cnic: string | null; category_id: string | null; area_id: string | null;
  daily_wage: number; status: "active" | "on_leave" | "inactive"; notes: string | null; joined_on: string; created_at: string;
};
export type BookingStatus = "pending" | "confirmed" | "assigned" | "in_progress" | "completed" | "cancelled";
export type Booking = {
  id: string; ref_no: number; customer_id: string; customer_name: string; customer_phone: string; service_id: string;
  area_id: string | null; address: string; booking_type: "hourly" | "daily"; work_date: string; start_time: string;
  quantity: number; workers: number; rate: number; est_total: number; notes: string | null; status: BookingStatus;
  staff_id: string | null; final_amount: number | null; admin_notes: string | null; created_at: string; updated_at: string;
};
export const STATUSES: BookingStatus[] = ["pending", "confirmed", "assigned", "in_progress", "completed", "cancelled"];

// ---------------------------------------------------------------- helpers
export function normalizePhone(raw: string): string | null {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(2);
  if (d.startsWith("03") && d.length === 11) d = "92" + d.slice(1);
  if (d.startsWith("3") && d.length === 10) d = "92" + d;
  return /^923\d{9}$/.test(d) ? d : null;
}
export const phoneEmail = (p: string) => `${p}@phone.gharcare.pk`;
export const prettyPhone = (p?: string | null) => {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  return d.startsWith("92") && d.length === 12 ? `0${d.slice(2, 5)} ${d.slice(5)}` : p;
};
export const waLink = (num: string, text?: string) =>
  `https://wa.me/${num.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const rs = (n: number | null | undefined) => `Rs ${Math.round(Number(n || 0)).toLocaleString("en-PK")}`;
export const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
};
export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export async function callAuthHelper(body: Record<string, string>) {
  const { data: s } = await supabase.auth.getSession();
  const res = await fetch(`${url}/functions/v1/auth-helper`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${s.session?.access_token ?? key}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "error");
  return json;
}

// ---------------------------------------------------------------- app context
const DEFAULT_SETTINGS: Settings = {
  id: 1, business_name: "GharCare", town: "", phone: "+923259444057", whatsapp: "+923259444057",
  email: "gharcarepk@gmail.com", hours_text: "8:00 AM – 8:00 PM, 7 days", announcement_en: "", announcement_ur: "", logo_url: null, show_prices: false,
};

type AppCtx = {
  session: Session | null; profile: Profile | null; authReady: boolean;
  settings: Settings; categories: Category[]; services: Service[]; areas: Area[]; catalogReady: boolean;
  refreshProfile: () => Promise<void>; refreshCatalog: () => Promise<void>;
};
const Ctx = createContext<AppCtx>(null as unknown as AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

  const loadProfile = useCallback(async (uid?: string) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  const refreshCatalog = useCallback(async () => {
    const [c, s, a, st] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("areas").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (c.data) setCategories(c.data as Category[]);
    if (s.data) setServices(s.data as Service[]);
    if (a.data) setAreas(a.data as Area[]);
    if (st.data) setSettings(st.data as Settings);
    setCatalogReady(true);
  }, []);

  useEffect(() => {
    refreshCatalog();
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => loadProfile(s?.user.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, refreshCatalog]);

  return (
    <Ctx.Provider value={{
      session, profile, authReady, settings, categories, services, areas, catalogReady,
      refreshProfile: () => loadProfile(session?.user.id), refreshCatalog,
    }}>
      {children}
    </Ctx.Provider>
  );
}
export const useApp = () => useContext(Ctx);
