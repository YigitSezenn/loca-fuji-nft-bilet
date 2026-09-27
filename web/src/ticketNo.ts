export function formatTicketNo(id: bigint | string) {
  const digits = id.toString().replace(/\D/g, "").padStart(10, "0");
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
}

export function parseTicketNo(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!/^\d{10}$/.test(digits)) return null;
  return digits;
}