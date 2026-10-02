export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        subtasks: { orderBy: { sequence: "asc" }, include: { assignedAgent: true, bids: true } },
        centralEscrow: true,
      },
    });
    if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (err: any) {
    console.warn("[/api/tasks/[id]] Database unavailable:", err.message);
    return NextResponse.json({ error: "not found or database offline" }, { status: 404 });
  }
}
