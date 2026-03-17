import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:")) {
    throw new Error('Only SQLite is supported. Use DATABASE_URL="file:./dev.db".');
  }
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const prisma = createClient();

const SECTION_IDS = ["home", "services", "analysis", "assets"] as const;

const TYPE_BY_SECTION_ID: Record<(typeof SECTION_IDS)[number], string> = {
  home: "hero",
  services: "services",
  analysis: "analysis",
  assets: "assets",
};

function getArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function extractSectionInnerHtml(html: string, id: string): string | null {
  const needle = `<section id="${id}"`;
  const start = html.indexOf(needle);
  if (start === -1) return null;

  const startTagEnd = html.indexOf(">", start);
  if (startTagEnd === -1) return null;

  const end = html.indexOf("</section>", startTagEnd);
  if (end === -1) return null;

  return html.slice(startTagEnd + 1, end).trim();
}

async function main() {
  const url = getArg("--url") ?? "https://fedzx.com";
  const force = hasFlag("--force");

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  const page = await prisma.page.upsert({
    where: { key: "home" },
    update: {},
    create: { key: "home", title: "Home", status: "DRAFT" },
  });

  const existing = await prisma.pageModule.count({ where: { pageId: page.id } });
  if (existing > 0 && !force) {
    process.stdout.write(`Skip: home already has ${existing} modules. Re-run with --force to overwrite.\n`);
    return;
  }

  if (force) {
    await prisma.pageModule.deleteMany({ where: { pageId: page.id } });
  }

  const modulesToCreate = [];
  for (const sectionId of SECTION_IDS) {
    const inner = extractSectionInnerHtml(html, sectionId);
    if (!inner) {
      process.stdout.write(`Warn: section not found: ${sectionId}\n`);
      continue;
    }
    const type = TYPE_BY_SECTION_ID[sectionId];
    const order = SECTION_IDS.indexOf(sectionId);
    modulesToCreate.push({
      pageId: page.id,
      type,
      order,
      status: "PUBLISHED" as const,
      config: JSON.stringify({ html: inner }),
    });
  }

  if (modulesToCreate.length === 0) {
    process.stdout.write("No modules extracted.\n");
    return;
  }

  await prisma.pageModule.createMany({ data: modulesToCreate });
  process.stdout.write(`Seeded ${modulesToCreate.length} modules from ${url}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
