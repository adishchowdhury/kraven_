import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/db/demoUser";
import { ensureSystemWallets } from "@/lib/economy/wallets";
import { seedRegistry } from "@/lib/db/reset";

let isSeeding = false;
let isSeeded = false;
let lastSeedAttemptFailed = 0;

/**
 * Ensures that the database has the required foundational data:
 * 1. Demo User ("demo-user")
 * 2. System Wallets ("wallet-manager", "wallet-escrow-pool")
 * 3. Seeded Registry Agents & their wallets
 *
 * This runs lazily and idempotently. On fresh Vercel deployments where `prisma/seed.ts`
 * has never been run manually, this automatically initializes the tables on first use.
 */
export async function ensureDatabaseSeeded(): Promise<boolean> {
  if (isSeeded) return true;
  if (isSeeding) return false;
  if (Date.now() - lastSeedAttemptFailed < 30000) return false;

  isSeeding = true;
  try {
    // 1. Ensure Demo User exists
    await ensureDemoUser();

    // 2. Ensure System Wallets exist
    await ensureSystemWallets();

    // 3. Ensure Registry Agents exist
    const agentCount = await prisma.agent.count().catch(() => 0);
    if (agentCount === 0) {
      console.log("[Kraven DB] Fresh database detected. Auto-seeding registry agents and wallets...");
      await seedRegistry();
      console.log("[Kraven DB] Auto-seed complete.");
    }

    isSeeded = true;
    return true;
  } catch (err: any) {
    lastSeedAttemptFailed = Date.now();
    console.warn("[Kraven DB] ensureDatabaseSeeded encountered an issue:", err.message);
    return false;
  } finally {
    isSeeding = false;
  }
}
