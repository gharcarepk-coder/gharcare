import { useState } from "react";
import { prettyPhone, useApp } from "../lib/data";
import { useI18n } from "../lib/i18n";

/** Shows "📞 Call us"; the phone number appears only after a click. */
export default function CallButton({ className }: { className?: string }) {
  const { settings } = useApp();
  const { pick } = useI18n();
  const [shown, setShown] = useState(false);
  if (shown) {
    return <a href={`tel:${settings.phone}`} className={className}>📞 {prettyPhone(settings.phone)}</a>;
  }
  return (
    <button type="button" className={className ?? "link-btn"} onClick={() => setShown(true)}>
      📞 {pick("Call us", "کال کریں")}
    </button>
  );
}
