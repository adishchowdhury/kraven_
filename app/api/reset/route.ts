export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { resetDatabase } from "@/lib/db/reset";

export async function POST() {
  try {
    await resetDatabase();
    return NextResponse.json({ ok: true, message: "Database reset and re-seeded successfully." });
  } catch (err: any) {
    console.error("[/api/reset] Failed to reset database:", err.message);
    return NextResponse.json(
      { ok: false, error: `Failed to reset database: ${err.message}` },
      { status: 500 },
    );
  }
}
