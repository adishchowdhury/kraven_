export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events/emit";
import { runTask } from "@/lib/manager/orchestrator";
import { DEMO_USER_ID } from "@/lib/db/demoUser";
import { ensureDatabaseSeeded } from "@/lib/db/seedHelper";

const createTaskSchema = z.object({
  prompt: z.string().min(3).max(2000),
  budget: z.number().int().positive().max(1000),
  qualityThreshold: z.number().int().min(0).max(100).optional(),
  deadline: z.string().datetime().optional(),
  optimizationMode: z.enum(["A", "B"]).optional(),
});

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const tasks = await prisma.task.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.warn("[/api/tasks GET] Database unavailable:", err.message);
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { prompt, budget, qualityThreshold, deadline, optimizationMode } = parsed.data;

  try {
    // Ensures demo user, system wallets, and registry agents are present
    await ensureDatabaseSeeded();

    const task = await prisma.task.create({
      data: {
        prompt,
        budget,
        remainingBudget: budget,
        qualityThreshold: qualityThreshold ?? 70,
        deadline: deadline ? new Date(deadline) : null,
        status: "CREATED",
        userId: DEMO_USER_ID,
        optimizationMode: optimizationMode ?? "A",
      },
    });

    await emitEvent(prisma, { taskId: task.id, actor: "system", eventType: "TASK_CREATED", payload: { prompt, budget } });

    // In serverless (Vercel), using after() keeps the execution context alive
    // so background execution finishes instead of freezing on return.
    const executeBackground = async () => {
      try {
        await runTask(task.id);
      } catch (err: any) {
        console.error("[Tasks Route] Orchestrator error for task", task.id, err);
        const reason = err instanceof Error ? `internal orchestrator error: ${err.message}` : "internal orchestrator error";
        await prisma.task
          .update({
            where: { id: task.id },
            data: { status: "FAILED", finalOutput: JSON.stringify({ content: null, failure_reason: reason }) },
          })
          .catch(() => {});
      }
    };

    if (typeof after === "function") {
      try {
        after(executeBackground);
      } catch {
        setTimeout(() => {
          executeBackground().catch(() => {});
        }, 10);
      }
    } else {
      setTimeout(() => {
        executeBackground().catch(() => {});
      }, 10);
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    console.error("[/api/tasks POST] Database operation failed:", err.message);
    return NextResponse.json(
      { error: `Database connection error: ${err.message}. Please check your PostgreSQL server.` },
      { status: 503 },
    );
  }
}
