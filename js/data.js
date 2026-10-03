// Yearbook data (SPEC 12.3): data/index.json and data/<board>/FY<yyyy>/pet.json, published by the device.
// ?data=data-debug shows development pets; if data/ has nothing yet, the site falls back to data-debug/.
const params = new URLSearchParams(location.search);

let rootPromise = null;
export function dataRoot() {
  if (!rootPromise) {
    rootPromise = (async () => {
      const want = params.get("data");
      if (want === "data" || want === "data-debug") return want;
      try {
        const r = await fetch("data/index.json", { cache: "no-cache" });
        if (r.ok) return "data";
      } catch { /* offline */ }
      return "data-debug";
    })();
  }
  return rootPromise;
}

async function getJson(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

export async function loadIndex() { return getJson(`${await dataRoot()}/index.json`); }
export async function loadPet(board, fy) { return getJson(`${await dataRoot()}/${board}/FY${fy}/pet.json`); }
export async function loadDiary(board, fy, year, month) {
  const m = String(month).padStart(2, "0");
  try { return await getJson(`${await dataRoot()}/${board}/FY${fy}/diary-${year}-${m}.json`); } catch { return null; }
}

// Timestamps are a date ("2026-10-03") under COARSE or a full ISO datetime under DETAILED (12.3).
export function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export const query = (k) => params.get(k);
export const isDebug = async () => (await dataRoot()) === "data-debug";
