// One-command release: bump version, sync it to every sub-package, commit,
// and create an annotated git tag. Pushing is left to you so you can review
// the release commit first.
//
// Usage: npm run release -- <patch|minor|major>
//        (or the shortcuts npm run release:patch / release:minor / release:major)

const { execSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUMPS = ["patch", "minor", "major"];

const run = (cmd, opts = {}) =>
    execSync(cmd, { cwd: ROOT, stdio: "inherit", ...opts });
const read = (cmd) =>
    execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();

function fail(message) {
    console.error(`❌ ${message}`);
    process.exit(1);
}

const bump = process.argv[2];
if (!BUMPS.includes(bump)) {
    fail(`Pakai: npm run release -- <${BUMPS.join("|")}>`);
}

// A release must contain exactly what's committed, nothing half-done.
if (read("git status --porcelain")) {
    fail("Working tree belum bersih. Commit atau stash perubahan dulu.");
}

const branch = read("git branch --show-current");
if (branch !== "main") {
    fail(`Release harus dari branch main (sekarang: ${branch || "detached HEAD"}).`);
}

run(`npm version ${bump} --no-git-tag-version`, { stdio: "ignore" });
run("node scripts/sync-version.js");

const version = require(path.join(ROOT, "package.json")).version;
const tag = `v${version}`;

run("git add package.json package-lock.json server agent web cashier");
run(`git commit -m "chore: release ${tag}"`);
run(`git tag -a ${tag} -m "Release ${tag}"`);

console.log("");
console.log(`✅ Release ${tag} dibuat (commit + tag).`);
console.log("   Push ke GitHub supaya bisa dipakai install.sh / install.ps1:");
console.log("   git push origin main --follow-tags");
