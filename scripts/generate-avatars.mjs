// Generates one SVG avatar per team member into public/avatars.
// Style: "Adventurer" by Lisa Wischofsky (CC BY 4.0), via DiceBear.
import { mkdir, writeFile } from "node:fs/promises";
import { createAvatar } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";
import team from "../src/lib/data/team.json" with { type: "json" };

const outDir = new URL("../public/avatars/", import.meta.url);
const backgrounds = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "c7f0d8"];

// Same rules as slugify() in src/lib/companies.ts.
const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

await mkdir(outDir, { recursive: true });

const names = [team.currentUser, ...team.owners.map((owner) => owner.name)];
for (const [i, name] of names.entries()) {
  const svg = createAvatar(adventurer, {
    seed: name,
    backgroundColor: [backgrounds[i % backgrounds.length]],
    radius: 50,
  }).toString();
  await writeFile(new URL(`${slugify(name)}.svg`, outDir), svg);
}

console.log(`Generated ${names.length} avatars in public/avatars`);
