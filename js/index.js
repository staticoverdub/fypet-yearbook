// index.html: one section per board (dynasty), one card per generation (SPEC 12.4).
import { decodeGenome, hobbyIndex } from "./genome.js";
import { HOBBY_NAMES } from "./hobbies.js";
import { makeCreature, drawCreature, drawEgg, prepareMythics, makeMythic, drawMythic, mythicInfo } from "./render.js";
import { tierOf } from "./tier.js";
import { Animator, loop } from "./anim.js";
import { loadIndex, loadPet, fmtDate, isDebug, query } from "./data.js";

const app = document.getElementById("app");
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const keep = query("data") ? `&data=${encodeURIComponent(query("data"))}` : "";

const actors = [];  // { ctx, creature | null (egg), genome, anim }

function card(board, pet, detail) {
  const a = el("a", "card");
  a.href = `pet.html?board=${board.board_id}&fy=${pet.fy}${keep}`;
  const cv = el("canvas");
  cv.width = 32 * 4; cv.height = 32 * 4;
  a.append(cv);
  a.append(el("div", "name", pet.name));
  const g1 = decodeGenome(pet.genome);
  const hobby = g1?.mythicId ? mythicInfo(g1.mythicId)?.hobby_label : detail ? HOBBY_NAMES[detail.hobbies?.primary] : null;
  a.append(el("div", "meta", `FY${pet.fy} · gen ${pet.generation}${hobby ? ` · ${hobby}` : ""}`));
  const status = el("div", "meta");
  const pill = el("span", `pill ${pet.status}`, pet.status === "alive" ? "On duty" : pet.status === "egg" ? "Egg" : "Funding lapsed");
  status.append(pill);
  const g0 = decodeGenome(pet.genome);
  const tier = g0 ? tierOf(g0) : "common";
  if (tier !== "common") status.append(" ", el("span", `pill tier-${tier}`, tier[0].toUpperCase() + tier.slice(1)));
  if (pet.status !== "deceased" && detail?.updated) status.append(` updated ${fmtDate(detail.updated)}`);
  a.append(status);
  const genome = decodeGenome(pet.genome);
  if (genome) {
    const stage = pet.status === "egg" ? null : pet.status === "deceased" ? "elder" : detail?.stage || "adult";
    actors.push({ ctx: cv.getContext("2d"), genome,
                  creature: stage ? (genome.mythicId ? makeMythic(genome, stage) : makeCreature(genome, stage)) : null,
                  still: pet.status === "deceased", anim: new Animator(genome.detailSeed, genome.fidget) });
  }
  return a;
}

async function main() {
  await prepareMythics();
  let index;
  try {
    index = await loadIndex();
  } catch {
    app.replaceChildren(el("p", "empty", "No pets have reported for duty yet."));
    return;
  }
  app.replaceChildren();
  if (await isDebug()) app.append(el("p", "devnote", "Development pets (data-debug). The real yearbook starts when the first pet goes live."));
  for (const board of index.boards || []) {
    const sec = el("section", "dynasty");
    sec.append(el("h2", null, board.surname ? `The ${board.surname} line` : `${board.owner || "Someone"}'s desk`));
    const gens = board.pets?.length || 0;
    sec.append(el("p", "sub", `Desk of ${board.owner || "someone"} · ${gens} generation${gens === 1 ? "" : "s"}`));
    const tree = el("div", "tree");
    sec.append(tree);
    app.append(sec);
    const pets = [...(board.pets || [])].sort((a, b) => a.fy - b.fy);
    for (const pet of pets) {
      const detail = await loadPet(board.board_id, pet.fy).catch(() => null);
      tree.append(card(board, pet, detail));
    }
  }
  if (index.updated) app.append(el("p", "sub", `Last updated ${fmtDate(index.updated)}`));
  loop((now) => {
    for (const a of actors) {
      a.ctx.clearRect(0, 0, 128, 128);
      if (!a.creature) drawEgg(a.ctx, a.genome, 0, 0, 4, (Math.trunc(now / 400) % 6 === 0) ? 1 : 0);
      else if (a.creature.mythic) drawMythic(a.ctx, a.creature, a.still ? {} : a.anim.frame(now, 20), 4, 8, 3, 40, 40, now);
      else if (a.still) drawCreature(a.ctx, a.creature, { eyesClosed: true, dropRow: -1, yOffset: 0 }, 0, 0, 4);  // a portrait
      else drawCreature(a.ctx, a.creature, a.anim.frame(now, a.creature.open.height), 0, 0, 4);
    }
  });
}

main();
