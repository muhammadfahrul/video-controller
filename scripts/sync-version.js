// Copies the root package.json version into every sub-package so the whole
// app (server, agent, web, cashier) always ships under one version number.
// Usage: node scripts/sync-version.js   (run automatically by `npm run release:*`)

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PACKAGES = ["server", "agent", "web", "cashier"];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const version = readJson(path.join(ROOT, "package.json")).version;

for (const pkg of PACKAGES) {
    for (const name of ["package.json", "package-lock.json"]) {
        const file = path.join(ROOT, pkg, name);
        if (!fs.existsSync(file)) continue;

        const json = readJson(file);
        json.version = version;
        // package-lock.json keeps a second copy of the version under packages[""]
        if (json.packages && json.packages[""]) {
            json.packages[""].version = version;
        }
        fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
    }
    console.log(`✅ ${pkg} -> ${version}`);
}
