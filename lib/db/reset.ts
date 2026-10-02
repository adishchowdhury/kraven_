import { prisma } from "@/lib/prisma";
import { ensureSystemWallets, ensureAgentWallet } from "@/lib/economy/wallets";
import { ensureDemoUser } from "@/lib/db/demoUser";
import { REGISTRY_AGENTS } from "@/lib/db/registryAgents";

export { REGISTRY_AGENTS };

export async function seedRegistry() {
  await ensureDemoUser();
  await ensureSystemWallets();
  for (const a of REGISTRY_AGENTS) {
    await prisma.agent.upsert({
      where: { id: a.id },
      update: {
        name: a.name,
        capabilities: JSON.stringify(a.capabilities),
        price: a.price,
        endpoint: a.endpoint,
        status: "ACTIVE",
        provider: "local",
        model: a.model ?? null,
      },
      create: {
        id: a.id,
        name: a.name,
        capabilities: JSON.stringify(a.capabilities),
        price: a.price,
        endpoint: a.endpoint,
        status: "ACTIVE",
        provider: "local",
        model: a.model ?? null,
        reputation: a.seedReputation,
        successRate: a.seedSuccessRate,
        avgQuality: a.seedAvgQuality,
        avgLatencyMs: a.seedAvgLatencyMs,
        totalJobs: 10,
        successCount: 9,
      },
    });
    await ensureAgentWallet(a.id);
  }
}

export async function resetDatabase() {
  await prisma.blockchainWorkflowEvent.deleteMany({});
  await prisma.algorandLedgerTransaction.deleteMany({});
  await prisma.securityEvent.deleteMany({});
  await prisma.workflowMemory.deleteMany({});
  await prisma.agentPerformance.deleteMany({});
  await prisma.centralLedger.deleteMany({});
  await prisma.centralEscrow.deleteMany({});
  await prisma.agentLedger.deleteMany({});
  await prisma.agentEscrow.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.subtask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.user.deleteMany({});
  await seedRegistry();
}
