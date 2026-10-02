import { execSync } from "child_process";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.SUPABASE_DATABASE_URL ||
  "";

if (url && !url.includes("localhost") && !url.includes("dummy:dummy")) {
  console.log("[db-deploy] Remote database detected. Syncing schema via prisma db push...");
  try {
    execSync("npx prisma db push --accept-data-loss", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
    console.log("[db-deploy] Schema synced successfully.");
  } catch (err) {
    console.warn("[db-deploy] Notice: prisma db push did not complete during build:", err.message);
  }
} else {
  console.log("[db-deploy] Local or dummy DATABASE_URL detected. Skipping remote schema push.");
}
