import fs from "node:fs";
import path from "node:path";

const bundleDir = ".remotion-bundle";

function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.name.endsWith(".map")) {
      fs.rmSync(fullPath);
    }
  }
}

if (fs.existsSync(bundleDir)) {
  walk(bundleDir);
}
