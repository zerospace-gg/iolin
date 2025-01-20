import fs from "node:fs/promises";
import path from "node:path";

const items = {
  mutators: [
    ["Sudden Death", "Units and structures die in one hit"],
    ["Time Out", "No Heroes"],
    ["Lockdown", "Faction Powers are disabled"],
    ["Depletion", "-50% mining rate"],
  ],

  boons: [
    ["Goldrush", "3x faster mining"],
    ["Detonation", "Units explode on death"],
    ["Haste", "+70% movement speed"],
    ["Spiderlings", "Spiderlings spawn after a unit is killed"],
    ["Shielding", "Units gain 200 shields"],
    ["Retribution", "Unit deaths empowers other nearby units"],
    ["Extra Protection", "+8 armor for units and structures"],
    ["Endurance", "Units have double health and shields"],
    [
      "Battery Pack",
      "+100% attack speed, max energy, and energy regeneration for casters",
    ],
    ["Light Power", "+50% weapon damage dealt by units with light armor"],
    ["Mid Power", "+50% weapon damage dealt by units with medium armor"],
    ["Heavy Power", "+50% weapon damage dealt by units with heavy armor"],
    ["Air Supremacy", "Air units deal +50% damage"],
    ["Extended Range", "+500 unit weapon and sight range"],
    ["Extra Supply", "+50 Max Supply"],
    ["Siphon", "50% damage dealt heals your units"],
    ["Heavy Ordnance", "Buildings have +200% attack speed and +800 range"],
  ],
};

const tofn = (name) => name.toLowerCase().replace(/ /g, "_");

let files = {};

for (const [name, desc] of items.mutators) {
  var fn = `misc/mutator/${tofn(name)}.pkl`;
  files[fn] = `
amends ".../engine/mutator.pkl"

name = "${name}"
description = "${desc}"
  `.trim();
}

for (const [name, desc] of items.boons) {
  var fn = `misc/boon/${tofn(name)}.pkl`;
  files[fn] = `
amends ".../engine/boon.pkl"

name = "${name}"
description = "${desc}"
  `.trim();
}

console.log(files);

for (const [fn, content] of Object.entries(files)) {
  const fullpath = path.join(process.cwd(), "zerospace", fn);
  console.log("=== " + fullpath);
  // console.log(content);
  await fs.mkdir(path.dirname(fullpath), { recursive: true });
  await fs.writeFile(fullpath, content, "utf8");
}
