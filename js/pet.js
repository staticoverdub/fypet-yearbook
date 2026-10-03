// pet.html?board=1e1b62&fy=2027: one pet's life page (SPEC 12.4).
import { decodeGenome } from "./genome.js";
import { HOBBY_NAMES } from "./hobbies.js";
import { makeCreature, drawCreature, drawEgg, prepareMythics, makeMythic, drawMythic, mythicInfo } from "./render.js";
import { tierOf } from "./tier.js";
import { Animator, loop } from "./anim.js";
import { loadPet, loadDiary, fmtDate, isDebug, query } from "./data.js";
import { MILESTONES, STATS, STAGE_LABEL } from "./labels.js";

const app = document.getElementById("app");
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const STAGES = ["hatchling", "juvenile", "adult", "elder"];
const W = 320, H = 172, SCALE = 3;

function loadImage(src) {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function heroSection(pet, genome) {
  const hero = el("div", "hero");
  const cv = el("canvas");
  cv.width = W; cv.height = H;
  hero.append(cv);
  const deceased = !!pet.died_at;
  if (deceased) {
    const t = el("img", "tomb");
    t.src = "assets/tombstone.png";
    t.alt = "";
    t.onerror = () => t.remove();
    hero.append(t);
  }
  const ctx = cv.getContext("2d");
  const anim = new Animator(genome.detailSeed, genome.fidget);
  const isEgg = pet.stage === "egg" && !pet.hatched_at;
  let stage = deceased ? "elder" : STAGES.includes(pet.stage) ? pet.stage : "adult";
  const make = (st) => (genome.mythicId ? makeMythic(genome, st) : makeCreature(genome, st));
  let creature = make(stage);
  const wrap = el("div");
  wrap.append(hero);
  if (!isEgg) {
    const row = el("div", "row");
    const label = el("label", null, `Stage: ${STAGE_LABEL[stage]}`);
    const slider = el("input");
    slider.type = "range"; slider.min = 0; slider.max = 3; slider.value = STAGES.indexOf(stage);
    slider.setAttribute("aria-label", "Stage");
    slider.oninput = () => {
      stage = STAGES[+slider.value];
      label.textContent = `Stage: ${STAGE_LABEL[stage]}`;
      creature = make(stage);
      anim.hop(performance.now());
    };
    row.append(label, slider);
    wrap.append(row);
  }
  cv.onclick = () => anim.hop(performance.now());
  loadImage("assets/backdrop.png").then((bg) => {
    loop((now) => {
      if (bg) ctx.drawImage(bg, 0, 0, W, H);
      else {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#4d9be6"); g.addColorStop(0.7, "#8fd3ff"); g.addColorStop(0.7, "#30e1b9"); g.addColorStop(1, "#1ebc73");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      const x = Math.round(W / 2 - 16 * SCALE), y = H - 30 - 30 * SCALE;
      if (isEgg) drawEgg(ctx, genome, x, y, SCALE, Math.trunc(now / 400) % 6 === 0 ? 1 : 0);
      else if (creature.mythic) drawMythic(ctx, creature, deceased ? {} : anim.frame(now, 20), x, y - 8 * SCALE, SCALE, 32, 40, now);
      // A deceased pet is a still portrait, eyes closed (no breathing); the slider still shows its life stages.
      else drawCreature(ctx, creature, deceased ? { eyesClosed: true, dropRow: -1, yOffset: 0 } : anim.frame(now, creature.open.height), x, y, SCALE);
    });
  });
  return wrap;
}

async function diarySection(board, pet) {
  const sec = el("section");
  sec.append(el("h2", null, "Diary"));
  const start = new Date(`${(pet.egg_at || pet.hatched_at || "").slice(0, 10)}T12:00:00`);
  const end = new Date(`${(pet.died_at || pet.updated || "").slice(0, 10)}T12:00:00`);
  const months = [];
  for (let d = new Date(end.getFullYear(), end.getMonth(), 1); d >= new Date(start.getFullYear(), start.getMonth(), 1) && months.length < 13;
       d = new Date(d.getFullYear(), d.getMonth() - 1, 1))
    months.push([d.getFullYear(), d.getMonth() + 1]);
  const ul = el("ul", "diary");
  for (const [y, m] of months) {
    const doc = await loadDiary(board, pet.fy, y, m);
    for (const e of [...(doc?.entries || [])].reverse()) {
      const li = el("li");
      li.append(el("span", "d", fmtDate(e.date)), e.text);
      ul.append(li);
    }
  }
  sec.append(ul.children.length ? ul : el("p", "empty", "No diary pages published yet."));
  return sec;
}

async function main() {
  const board = query("board"), fy = query("fy");
  let pet;
  try {
    if (!board || !fy) throw new Error("missing board or fy");
    pet = await loadPet(board, fy);
  } catch {
    app.replaceChildren(el("p", "empty", "That pet isn't in the yearbook."));
    return;
  }
  await prepareMythics();
  const genome = decodeGenome(pet.genome);
  const name = [pet.given, pet.surname, pet.numeral].filter(Boolean).join(" ");
  document.title = `${name} | FYDO`;
  app.replaceChildren();
  if (await isDebug()) app.append(el("p", "devnote", "Development pet (data-debug)."));
  app.append(el("h1", null, name));
  const mi = genome?.mythicId ? mythicInfo(genome.mythicId) : null;
  const hobby = mi ? mi.hobby_label : HOBBY_NAMES[pet.hobbies?.primary];
  const tier = genome ? tierOf(genome) : "common";
  const tierLabel = tier === "common" ? null : tier[0].toUpperCase() + tier.slice(1);
  app.append(el("p", "sub", [tierLabel, `Generation ${pet.generation}`, `FY${pet.fy}`, pet.grade, pet.temperament, hobby].filter(Boolean).join(" · ")));
  const dates = pet.died_at ? `${fmtDate(pet.hatched_at)} to ${fmtDate(pet.died_at)}`
              : pet.hatched_at ? `Hatched ${fmtDate(pet.hatched_at)}` : `Egg since ${fmtDate(pet.egg_at)}`;
  app.append(el("p", "sub", dates));
  if (genome) app.append(heroSection(pet, genome));

  if (pet.died_at && pet.obituary?.long) {
    const sec = el("section");
    sec.append(el("h2", null, "In memoriam"));
    const ob = el("div", "obit");
    ob.append(el("p", null, pet.obituary.long));
    if (pet.time_capsule) ob.append(el("p", "capsule", `Time capsule, sealed at hatch: "${pet.time_capsule}"`));
    sec.append(ob);
    app.append(sec);
  }

  const ms = el("section");
  ms.append(el("h2", null, "Milestones"));
  if (pet.milestones?.length) {
    const ol = el("ol", "timeline");
    for (const m of pet.milestones) {
      const li = el("li", null, MILESTONES[m.id] || m.id);
      li.append(el("span", "when", fmtDate(m.at) + (m.belated ? " (while unplugged)" : "")));
      ol.append(li);
    }
    ms.append(ol);
  } else ms.append(el("p", "empty", "None yet."));
  app.append(ms);

  const st = el("section");
  st.append(el("h2", null, "Stats"));
  const dl = el("dl", "stats");
  for (const [k, label, fmt] of STATS) {
    const v = pet.stats?.[k];
    if (v == null) continue;
    const d = el("div");
    d.append(el("dt", null, label), el("dd", null, fmt ? fmt(v) : Number(v).toLocaleString()));
    dl.append(d);
  }
  st.append(dl);
  app.append(st);
  app.append(await diarySection(board, pet));
  if (pet.updated) app.append(el("p", "sub", `Updated ${fmtDate(pet.updated)}`));
}

main();
