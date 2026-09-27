const KEY = "tribun.ageProof";

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

export function hasAgeProof(address: string) {
  return read().includes(address.toLowerCase());
}

export function saveAgeProof(address: string) {
  const id = address.toLowerCase();
  const list = read();
  if (!list.includes(id)) localStorage.setItem(KEY, JSON.stringify([...list, id]));
}

export function clearAgeProof(address: string) {
  const id = address.toLowerCase();
  localStorage.setItem(KEY, JSON.stringify(read().filter((item) => item !== id)));
}
