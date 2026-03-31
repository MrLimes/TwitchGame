const SAVE_KEY = "king_mvp_lineage";

export function saveLineage({ baseName, generation, treasury, permanentModifiers }) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ baseName, generation, treasury, permanentModifiers }));
}

export function loadLineage() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearLineage() {
  localStorage.removeItem(SAVE_KEY);
}

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function stripOrdinal(name) {
  return name.replace(/\s+\d+(st|nd|rd|th)$/i, "").trim();
}
