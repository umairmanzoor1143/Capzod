import fs from "node:fs";

fs.rmSync("node_modules/.remotion/chrome-headless-shell", {
  recursive: true,
  force: true,
});
fs.rmSync(".remotion-public", {recursive: true, force: true});
fs.mkdirSync(".remotion-public", {recursive: true});
