/**
 * One-time backfill: rewrite stored author *names* to permanent author *slots*.
 *
 * Authored rows used to record a display name ("Praneeth"). Names live in
 * Settings and change, so renaming a partner orphaned every row they had ever
 * written -- the name no longer matched anything, and the UI quietly fell
 * through to the "both partners" styling. Slots never change.
 *
 * Deploy the slot-aware code BEFORE running this. New code reads old rows fine
 * (it falls back to the raw string); old code would render "hunter" literally.
 *
 *   node --env-file=.env.local scratch/backfill-author-slots.mjs          # dry run
 *   node --env-file=.env.local scratch/backfill-author-slots.mjs --apply  # write
 */
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const SLOT_ONE = "hunter";
const SLOT_TWO = "riceee";
const SLOT_BOTH = "both";
const KNOWN_SLOTS = new Set([SLOT_ONE, SLOT_TWO, SLOT_BOTH]);

const TARGETS = [
  { model: "entry", field: "author" },
  { model: "memory", field: "uploadedBy" },
  { model: "comment", field: "author" },
  { model: "draft", field: "author" },
];

const norm = (v) => String(v ?? "").trim().toLowerCase();

/**
 * Names that were in Settings when rows were written but have since been renamed
 * away, leaving nothing in the database to decode them.
 *
 * This is the orphaning bug biting the migration itself. Space yqx7rd read
 * one="Praneeth" during the dry run; a rename to "Hunter" landed before --apply
 * and erased the only proof of what its five "Praneeth" entries meant, so they
 * came back UNRESOLVED. Once the rename happens, no amount of inference gets it
 * back -- the evidence is genuinely gone and a human has to supply it.
 *
 * Every line needs provenance. Never guess: a wrong slot puts one partner's name
 * on the other's writing.
 */
const HISTORICAL_NAMES = {
  // yqx7rd: read as one="Praneeth" two="Toasty" on 2026-07-16, before the owner
  // renamed partner one to "Hunter" ("i changed my name to hunter from praneeth").
  cmr8yocy00000io81fbyqx7rd: { praneeth: SLOT_ONE },
};

/**
 * Build name -> slot for one space.
 *
 * Current settings names are the primary source. Historical "A x B" both-labels
 * are mined for the rest: a label proves A was partner one and B was partner two
 * at the time it was written, which is the only evidence that recovers an
 * already-orphaned name like "Mahek" after the rename erased it.
 */
function buildNameMap(space, values) {
  const map = new Map();
  const put = (name, slot) => {
    const key = norm(name);
    if (key && !map.has(key)) map.set(key, slot);
  };

  // Current settings first -- they're the strongest evidence and must win over
  // anything inferred below.
  put(space.partnerOneName, SLOT_ONE);
  put(space.partnerTwoName, SLOT_TWO);

  for (const [name, slot] of Object.entries(HISTORICAL_NAMES[space.id] ?? {})) {
    put(name, slot);
  }

  put("partner 1", SLOT_ONE);
  put("partner 2", SLOT_TWO);

  for (const value of values) {
    const parts = String(value ?? "").split(/\s+x\s+/i);
    if (parts.length === 2) {
      put(parts[0], SLOT_ONE);
      put(parts[1], SLOT_TWO);
    }
  }

  return map;
}

function classify(value, nameMap) {
  const key = norm(value);
  if (!key) return { slot: SLOT_BOTH, why: "empty -> both" };
  if (KNOWN_SLOTS.has(key)) return { slot: key, why: "already a slot" };
  if (key === "both partners") return { slot: SLOT_BOTH, why: "legacy both" };
  if (/\s+x\s+/i.test(value)) return { slot: SLOT_BOTH, why: "both-label" };

  const mapped = nameMap.get(key);
  if (mapped) return { slot: mapped, why: "name -> slot" };

  return { slot: null, why: "UNRESOLVED" };
}

const spaces = await db.user.findMany({
  select: { id: true, partnerOneName: true, partnerTwoName: true },
});
const spaceById = new Map(spaces.map((s) => [s.id, s]));

// Load every authored row up front. The evidence that decodes an orphaned name
// is often in a different table than the orphan itself -- "Mahek" only survives
// in entries, but the label proving Mahek was partner two ("Praneeth x Mahek")
// is on a memory. Per-model maps miss that; a per-space map across all models
// sees it.
const loaded = [];
for (const { model, field } of TARGETS) {
  const rows = await db[model].findMany({ select: { id: true, userId: true, [field]: true } });
  for (const row of rows) {
    loaded.push({ model, field, id: row.id, spaceId: row.userId, value: row[field] });
  }
}

const valuesBySpace = new Map();
for (const row of loaded) {
  if (!valuesBySpace.has(row.spaceId)) valuesBySpace.set(row.spaceId, []);
  valuesBySpace.get(row.spaceId).push(row.value);
}

// Names never cross spaces: two different couples can both have a "Praneeth".
const nameMapBySpace = new Map();
for (const [spaceId, values] of valuesBySpace) {
  const space = spaceById.get(spaceId);
  if (space) nameMapBySpace.set(spaceId, buildNameMap(space, values));
}

const backup = [];
let changed = 0;
let skipped = 0;
let unresolved = 0;
let lastGroup = "";

for (const row of loaded) {
  const group = `${row.model}.${row.field}`;
  if (group !== lastGroup) {
    console.log(`\n=== ${group} ===`);
    lastGroup = group;
  }

  const nameMap = nameMapBySpace.get(row.spaceId);
  if (!nameMap) continue;

  const { slot, why } = classify(row.value, nameMap);

  if (why === "already a slot") {
    skipped += 1;
    continue;
  }

  if (!slot) {
    unresolved += 1;
    console.log(`  UNRESOLVED  ${JSON.stringify(row.value)}  (space ${row.spaceId.slice(-6)}, id ${row.id})`);
    continue;
  }

  changed += 1;
  backup.push({ model: row.model, field: row.field, id: row.id, from: row.value, to: slot });
  console.log(`  ${JSON.stringify(row.value).padEnd(22)} -> ${slot.padEnd(7)} (${why})`);

  if (APPLY) {
    await db[row.model].update({ where: { id: row.id }, data: { [row.field]: slot } });
  }
}

if (backup.length) {
  const path = `scratch/author-slot-backup-${backup.length}.json`;
  writeFileSync(path, JSON.stringify(backup, null, 2));
  console.log(`\nBackup of previous values -> ${path}`);
}

console.log(`\n${changed} to change, ${skipped} already slots, ${unresolved} unresolved`);
console.log(APPLY ? "APPLIED." : "DRY RUN -- nothing written. Re-run with --apply.");

await db.$disconnect();
process.exit(unresolved ? 1 : 0);
