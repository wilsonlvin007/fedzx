import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });
dotenv.config();

async function main() {
  const { exportPublicSite } = await import("../src/lib/public-export");
  await exportPublicSite();
  console.log("Public site export completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
