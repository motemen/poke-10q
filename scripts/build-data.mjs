// PokeAPI の CSV (https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) から data/pokemon.js を生成する。
// file:// でも開けるように JSON ではなく window.POKEMON に代入するスクリプトとして出力する。
// usage: node scripts/build-data.mjs <csv-dir>
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/build-data.mjs <csv-dir>");
  process.exit(1);
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const load = (name) => parseCSV(readFileSync(join(dir, `${name}.csv`), "utf8"));

const species = load("pokemon_species");
const pokemon = load("pokemon").filter((p) => p.is_default === "1");
const types = load("pokemon_types");
const names = load("pokemon_species_names").filter((n) => n.local_language_id === "1");

const byId = new Map();
for (const s of species) {
  const id = +s.id;
  if (id > 1025) continue;
  byId.set(id, {
    id,
    gen: +s.generation_id,
    color: +s.color_id,
    shape: +s.shape_id,
    legendary: s.is_legendary === "1",
    mythical: s.is_mythical === "1",
    baby: s.is_baby === "1",
    evolved: s.evolves_from_species_id !== "",
    evolves: false,
    genderless: s.gender_rate === "-1",
  });
}
for (const s of species) {
  const from = +s.evolves_from_species_id;
  if (from && byId.has(from)) byId.get(from).evolves = true;
}
// 進化段階（1 = 進化前）と、その系統が何段階あるか
const parentOf = new Map(species.map((s) => [+s.id, +s.evolves_from_species_id || 0]));
const stageOf = (id) => (parentOf.get(id) ? 1 + stageOf(parentOf.get(id)) : 1);
const chainOf = new Map(species.map((s) => [+s.id, +s.evolution_chain_id]));
const chainStages = new Map();
for (const sp of byId.values()) {
  sp.stage = stageOf(sp.id);
  const c = chainOf.get(sp.id);
  chainStages.set(c, Math.max(chainStages.get(c) ?? 0, sp.stage));
}
for (const sp of byId.values()) sp.chainStages = chainStages.get(chainOf.get(sp.id));
const pokeToSpecies = new Map();
for (const p of pokemon) {
  const sp = byId.get(+p.species_id);
  if (!sp) continue;
  pokeToSpecies.set(p.id, sp);
  sp.height = +p.height; // デシメートル
  sp.weight = +p.weight; // ヘクトグラム
  sp.types = [];
}
for (const t of types) {
  const sp = pokeToSpecies.get(t.pokemon_id);
  if (sp) sp.types[+t.slot - 1] = +t.type_id;
}
for (const n of names) {
  const sp = byId.get(+n.pokemon_species_id);
  if (sp) { sp.name = n.name; sp.genus = n.genus; }
}

const list = [...byId.values()].sort((a, b) => a.id - b.id);
for (const p of list) {
  if (!p.name || !p.types?.length || p.height == null) throw new Error(`incomplete: ${p.id}`);
}
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "pokemon.js");
writeFileSync(out, "window.POKEMON = [\n" + list.map((p) => JSON.stringify(p)).join(",\n") + "\n];\n");
console.log(`wrote ${list.length} pokemon to ${out}`);
