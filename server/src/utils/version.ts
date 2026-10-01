import fs from "fs";
import path from "path";

// Resolves to server/package.json from both src/utils (dev) and dist/utils (build).
function readVersion(): string {
    try {
        const pkgPath = path.join(__dirname, "..", "..", "package.json");
        return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version ?? "unknown";
    } catch {
        return "unknown";
    }
}

export const APP_VERSION = readVersion();
