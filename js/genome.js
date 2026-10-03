// Genome decode/encode (SPEC 5.1, DECISIONS D-057). PARITY CONTRACT with src/core/genome.cpp.
export const GENES = [
  ["bodyTemplate", 3], ["bodySize", 2], ["palette", 5], ["eyes", 3], ["crest", 3], ["limbs", 2],
  ["pattern", 2], ["tail", 2], ["detailSeed", 16], ["temperament", 2], ["energy", 3], ["fidget", 3],
  ["favSpot", 3], ["hobbyPrimary", 5], ["hobbySecondary", 5], ["hobbyRecessive", 5], ["nameSeed", 10],
  ["shiny", 1],  // SPEC 9.10
  ["mythicId", 3],  // D-091: 0 none, 1-5 mythic characters, 6-7 reserved (rejected)
];
export const MYTHIC_COUNT = 5;
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const HOBBY_POOL_SIZE = 20;

function decodeChar(c) {
  c = c.toUpperCase();
  if (c === "I" || c === "L") return 1;
  if (c === "O") return 0;
  return ALPHABET.indexOf(c);
}

// Returns a genome object, or null if invalid (prefix, length, characters, reserved bits).
export function decodeGenome(text) {
  if (typeof text !== "string" || text.length !== 19 || text.slice(0, 3).toLowerCase() !== "v1-") return null;
  const bits = [];
  for (const ch of text.slice(3)) {
    const v = decodeChar(ch);
    if (v < 0) return null;
    for (let b = 4; b >= 0; b--) bits.push((v >> b) & 1);
  }
  const g = {};
  let pos = 0;
  for (const [name, n] of GENES) {
    let v = 0;
    for (let b = 0; b < n; b++) v = v * 2 + bits[pos++];
    g[name] = v;
  }
  for (; pos < 80; pos++) if (bits[pos]) return null;
  if (g.mythicId > MYTHIC_COUNT) return null;
  return g;
}

export function encodeGenome(g) {
  const bits = [];
  for (const [name, n] of GENES) for (let b = n - 1; b >= 0; b--) bits.push((g[name] >> b) & 1);
  while (bits.length < 80) bits.push(0);
  let out = "v1-";
  for (let c = 0; c < 16; c++) {
    let v = 0;
    for (let b = 0; b < 5; b++) v = v * 2 + bits[c * 5 + b];
    out += ALPHABET[v];
  }
  return out;
}

export const hobbyIndex = (gene) => gene % HOBBY_POOL_SIZE;
