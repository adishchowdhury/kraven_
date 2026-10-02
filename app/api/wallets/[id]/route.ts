export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseSeeded } from "@/lib/db/seedHelper";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await ensureDatabaseSeeded();
    const wallet = await prisma.wallet.findUnique({ where: { id } });
    if (wallet) return NextResponse.json({ wallet });
  } catch (err: any) {
    console.warn("[/api/wallets] Database unavailable:", err.message);
  }

  // Fallback default wallet
  return NextResponse.json({
    wallet: {
      id,
      balance: 1000,
      type: id.includes("agent") ? "AGENT" : "MANAGER",
      algorandAddress: process.env.ALGOD_SENDER_ADDRESS || "PRVLKHVPVSMCNDO6PEWHOVWPR3JVBEQVAX4V2TCFN4RMCDC54R3FB34QMM",
    },
  });
}

