import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/client/assets", { recursive: true });
await mkdir("dist/client/assets/qstyle-v2", { recursive: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });

for (const file of ["index.html", "styles.css", "q-style.css", "production-fix.css", "partner-system.js", "game.js", "production-rows.js", "admin.html", "admin.js"]) {
  await cp(file, `dist/client/${file}`);
}
const gameAssets = [
  "bgm-battle-user-v1.wav",
  "bgm-body-cultivation-user-v1.wav",
  "bgm-body-trial-user-v1.wav",
  "bgm-main-user-v4.wav",
  "bgm-mainline-01.wav",
  "bgm-mainline-02.wav",
  "bgm-mainline-03.wav",
  "bgm-mainline-04.wav",
  "bgm-mainline-05.wav",
  "bgm-mainline-06.wav",
  "bgm-mainline-07.wav",
  "bgm-mainline-08.wav",
  "bgm-mainline-09.wav",
  "bgm-ascension-prologue.wav",
  "bgm-ascension-heart.wav",
  "bgm-ascension-delusion.wav",
  "bgm-ascension-road-end.wav",
  "bgm-immortal-barren.wav",
  "bgm-sword-breakthrough-user-v1.wav",
  "bgm-sword-cultivation-user-v1.wav",
  "bgm-sword-trial-user-v1.wav",
  "bgm-tutorial-user-v1.wav",
  "sword-breakthrough-righteous.mp4",
  "sword-breakthrough-evil.mp4",
  "sword-breakthrough-balance.mp4",
  "sword-breakthrough-unmarked.mp4",
  "bgm-title-user-v3.wav",
  "bgm-tribulation-success-v1.wav",
  "bgm-tribulation-failure-v1.wav",
];
for (const asset of gameAssets) {
  await cp(`assets/${asset}`, `dist/client/assets/${asset}`);
}
await cp("assets/qstyle-v2", "dist/client/assets/qstyle-v2", { recursive: true });
await cp("sw.js", "dist/client/sw.js");
await cp(".openai/hosting.json", "dist/.openai/hosting.json");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const clientRoot = join(process.cwd(), "dist/client");
const outputFiles = (await walk(clientRoot))
  .filter(path => !path.endsWith(`${sep}sw.js`));
const revisions = {};
for (const path of outputFiles) {
  const key = relative(clientRoot, path).split(sep).join("/");
  revisions[key] = createHash("sha256").update(await readFile(path)).digest("hex").slice(0, 16);
}
const shell = ["index.html", "styles.css", "q-style.css", "production-fix.css", "partner-system.js", "game.js", "production-rows.js"];
const coreNames = new Set([
  "title-bg.png", "main-bg.png", "main-bg-sword-v1.png", "main-bg-body-v1.png",
  "female-outfit-1.png", "male-outfit-1.png", "female-outfit-2.png", "male-outfit-2.png",
  "spirit-stone.png", "spirit-jade.png", "reputation.png", "nav-root.png", "nav-cave.png",
  "nav-sect.png", "nav-arts.png", "nav-experience.png", "nav-bag.png"
]);
const images = Object.keys(revisions).filter(path => /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(path));
const core = images.filter(path => coreNames.has(path.split("/").at(-1)));
const visuals = images.filter(path => !core.includes(path));
let worker = await readFile("dist/client/sw.js", "utf8");
worker = worker
  .replace("__ASSET_REVISIONS__", JSON.stringify(revisions))
  .replace("__APP_SHELL__", JSON.stringify(shell))
  .replace("__CORE_ASSETS__", JSON.stringify(core))
  .replace("__VISUAL_ASSETS__", JSON.stringify(visuals));
await writeFile("dist/client/sw.js", worker);

await writeFile(
  "dist/server/index.js",
  `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};\n`,
);
