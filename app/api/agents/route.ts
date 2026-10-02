export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REGISTRY_AGENTS } from "@/lib/db/reset";
import { ensureDatabaseSeeded } from "@/lib/db/seedHelper";

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const agents = await prisma.agent.findMany({ orderBy: { name: "asc" } });
    if (agents && agents.length > 0) {
      return NextResponse.json({
        agents: agents.map((a) => ({
          ...a,
          capabilities: typeof a.capabilities === "string" ? JSON.parse(a.capabilities) : a.capabilities,
        })),
      });
    }
  } catch (err: any) {
    console.warn("[/api/agents] Database unavailable, using registry fallback:", err.message);
  }

  const fallbackAgents = REGISTRY_AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    capabilities: a.capabilities,
    price: a.price,
    endpoint: a.endpoint,
    model: a.model ?? null,
    status: "ACTIVE",
    reputation: a.seedReputation,
    successRate: a.seedSuccessRate,
    avgQuality: a.seedAvgQuality,
    avgLatencyMs: a.seedAvgLatencyMs,
    avgCost: a.price,
    totalJobs: 0,
    successCount: 0,
  }));

  return NextResponse.json({ agents: fallbackAgents });
}

