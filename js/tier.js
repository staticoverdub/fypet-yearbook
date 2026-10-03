// Rarity tier of a genome (D-091). PARITY with core::genomeTier: mythic > legendary > rare (shiny) > common.
import { TIERS, LEGENDARY } from "./rarity.js";

export function tierOf(g) {
  if (g.mythicId) return "mythic";
  if (LEGENDARY.palette.includes(g.palette) || LEGENDARY.eyes.includes(g.eyes) || LEGENDARY.crest.includes(g.crest)) return "legendary";
  if (g.shiny) return "rare";
  return "common";
}

export const tierColor = (id) => TIERS.find((t) => t.id === id)?.color ?? 0;
