export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma, getDatabaseUrl, isDatabaseConfigured } from "@/lib/prisma";
import { ensureDatabaseSeeded } from "@/lib/db/seedHelper";
import { isGeminiConfigured } from "@/lib/manager/gemini";

export async function GET() {
  const dbUrl = getDatabaseUrl();
  const dbConfigured = isDatabaseConfigured();
  const geminiConfigured = isGeminiConfigured();

  const envStatus = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasPostgresPrismaUrl: Boolean(process.env.POSTGRES_PRISMA_URL),
    hasPostgresUrl: Boolean(process.env.POSTGRES_URL),
    hasGeminiKey: geminiConfigured,
    promptModelEnabled: process.env.PROMPT_MODEL_ENABLED === "true",
    isVercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV,
  };

  const start = Date.now();
  let dbConnected = false;
  let dbLatencyMs = -1;
  let dbError: string | null = null;
  let counts: Record<string, number> = {};

  try {
    // 1. Ping the database
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    dbLatencyMs = Date.now() - start;

    // 2. Ensure foundational data exists
    await ensureDatabaseSeeded();

    // 3. Count core entities
    const [users, agents, wallets, tasks, subtasks] = await Promise.all([
      prisma.user.count().catch(() => -1),
      prisma.agent.count().catch(() => -1),
      prisma.wallet.count().catch(() => -1),
      prisma.task.count().catch(() => -1),
      prisma.subtask.count().catch(() => -1),
    ]);

    counts = { users, agents, wallets, tasks, subtasks };
  } catch (err: any) {
    dbConnected = false;
    dbError = err.message || "Unknown database error";
  }

  const isHealthy = dbConnected;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      database: {
        connected: dbConnected,
        configured: dbConfigured,
        latencyMs: dbLatencyMs,
        error: dbError,
        counts: dbConnected ? counts : null,
      },
      environment: envStatus,
      timestamp: new Date().toISOString(),
      troubleshooting: !dbConnected
        ? "PostgreSQL database is unreachable. In your Vercel Project Settings > Environment Variables, add DATABASE_URL (or POSTGRES_PRISMA_URL) from Neon, Supabase, or Vercel Postgres."
        : undefined,
    },
    { status: isHealthy ? 200 : 503 },
  );
}
