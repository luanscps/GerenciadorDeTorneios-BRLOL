import { NextRequest, NextResponse } from "next/server";
import { getMatchById } from "@/lib/riot";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    return NextResponse.json(await getMatchById(matchId));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro" }, { status: 500 });
  }
}
