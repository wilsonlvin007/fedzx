import fs from "node:fs";
import path from "node:path";

// Prisma's SQLite schema engine can fail if the target file does not exist yet.
// Creating an empty file avoids first-run errors in some environments.
const dbPath = path.join(process.cwd(), "dev.db");
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "");
  process.stdout.write(`Created ${dbPath}\n`);
} else {
  process.stdout.write(`OK ${dbPath}\n`);
}

