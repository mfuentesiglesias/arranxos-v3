// ── Anti-leak: detect contact info in chat messages ─────────────────────────
// DEMO: rules hardcoded here are starter defaults. In prod these should be
// configurable from admin and applied server-side too (not just client UI).

export interface LeakMatch {
  type: "phone" | "email" | "url" | "whatsapp" | "telegram";
  match: string;
  index: number;
}

// Spanish mobile/landline: 9 digits starting 6-9, with optional +34 / 0034
const PHONE_RE = /(?:(?:\+?34|0034)[\s.-]?)?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/g;
// Also catch blocks of 9+ consecutive digits (obfuscation attempts)
const DIGIT_CLUMP_RE = /\b\d{9,}\b/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_RE =
  /\b((https?:\/\/|www\.)[^\s<>]+|[a-z0-9-]+\.(com|gal|es|org|net|eu|app|io|me)(\/[^\s<>]*)?)\b/gi;
const WHATSAPP_RE = /\b(whats\s*app|wsp|wass?ap|wa\.me)\b/gi;
const TELEGRAM_RE = /\b(telegram|t\.me)\b/gi;

export function scanLeaks(text: string): LeakMatch[] {
  const leaks: LeakMatch[] = [];
  const push = (type: LeakMatch["type"], re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      leaks.push({ type, match: m[0], index: m.index });
    }
  };
  push("phone", PHONE_RE);
  push("phone", DIGIT_CLUMP_RE);
  push("email", EMAIL_RE);
  push("url", URL_RE);
  push("whatsapp", WHATSAPP_RE);
  push("telegram", TELEGRAM_RE);
  // Dedupe overlapping matches
  const seen = new Set<string>();
  return leaks.filter((l) => {
    const k = `${l.index}:${l.match}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function redactLeaks(text: string): string {
  let out = text;
  out = out.replace(PHONE_RE, "••• ••• •••");
  out = out.replace(DIGIT_CLUMP_RE, "•••••••••");
  out = out.replace(EMAIL_RE, "•••@•••");
  out = out.replace(URL_RE, "[enlace oculto]");
  out = out.replace(WHATSAPP_RE, "[canal externo]");
  out = out.replace(TELEGRAM_RE, "[canal externo]");
  return out;
}

export function hasLeak(text: string) {
  return scanLeaks(text).length > 0;
}

export const LEAK_LABELS: Record<LeakMatch["type"], string> = {
  phone: "número de teléfono",
  email: "correo electrónico",
  url: "enlace externo",
  whatsapp: "canal externo (WhatsApp)",
  telegram: "canal externo (Telegram)",
};
