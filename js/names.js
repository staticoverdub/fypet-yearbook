// Given names (SPEC 5.5). PARITY CONTRACT with src/core/names.cpp givenName().
// Algorithm and tables: content/names.json (tables generated into names_tables.js).
import { mulberry32 } from "./prng.js";
import { ONSETS, MIDDLES, ENDINGS, BANNED_SUBSTRINGS } from "./names_tables.js";

export function nameIsBanned(lower) {
  return BANNED_SUBSTRINGS.some((b) => lower.includes(b));
}

export function givenName(nameSeed) {
  const next = mulberry32(nameSeed);
  const range = (n) => next() % n;
  for (;;) {
    const parts = [ONSETS[range(ONSETS.length)]];
    if (range(4) === 0) parts.push(MIDDLES[range(MIDDLES.length)]);
    parts.push(ENDINGS[range(ENDINGS.length)]);
    const joined = parts.join("");
    const name = joined[0].toUpperCase() + joined.slice(1).toLowerCase();
    if (!nameIsBanned(name.toLowerCase())) return name;
  }
}
