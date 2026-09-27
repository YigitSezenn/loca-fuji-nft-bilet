const KEY = "tribun.refundHold";
const HOLD_MS = 30_000;

function read(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (!raw || typeof raw !== "object") return {};
    return raw as Record<string, number>;
  } catch {
    return {};
  }
}

export function holdRefund(id: string) {
  const all = read();
  all[id] = Date.now() + HOLD_MS;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function refundLeft(id: string, now = Date.now()) {
  const until = read()[id] ?? 0;
  const left = until - now;
  return left > 0 ? Math.ceil(left / 1000) : 0;
}
