// GharCare auth helper — phone + password accounts without SMS.
// actions:
//   signup         { phone, password, full_name }      -> creates confirmed user
//   reset_password { phone, password }  (admin only)    -> sets a new password
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export function normalizePhone(raw: string): string | null {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(2);
  if (d.startsWith("03") && d.length === 11) d = "92" + d.slice(1);
  if (d.startsWith("3") && d.length === 10) d = "92" + d;
  return /^923\d{9}$/.test(d) ? d : null;
}
const phoneEmail = (p: string) => `${p}@phone.gharcare.pk`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  const phone = normalizePhone(body.phone);
  if (!phone) return json({ error: "invalid_phone" }, 400);
  const password = String(body.password || "");
  if (password.length < 6) return json({ error: "weak_password" }, 400);

  if (body.action === "signup") {
    const full_name = String(body.full_name || "").trim().slice(0, 80);
    if (full_name.length < 2) return json({ error: "invalid_name" }, 400);
    const { error } = await admin.auth.admin.createUser({
      email: phoneEmail(phone),
      password,
      email_confirm: true,
      user_metadata: { full_name, phone: "+" + phone },
    });
    if (error) {
      const exists = /already|registered|exists/i.test(error.message);
      return json({ error: exists ? "phone_taken" : error.message }, exists ? 409 : 400);
    }
    return json({ ok: true, email: phoneEmail(phone) });
  }

  if (body.action === "reset_password") {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: caller } = await admin.auth.getUser(token);
    if (!caller?.user) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await admin.from("profiles").select("role").eq("id", caller.user.id).single();
    if (prof?.role !== "admin") return json({ error: "forbidden" }, 403);

    const { data: target } = await admin.from("profiles").select("id").eq("phone", "+" + phone).maybeSingle();
    if (!target) return json({ error: "not_found" }, 404);
    const { error } = await admin.auth.admin.updateUserById(target.id, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
