import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin === true ? user : null;
}

// GET /api/admin/tournaments/[id]/stages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("tournament_stages")
    .select("*")
    .eq("tournament_id", id)
    .order("stage_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stages: data });
}

// POST /api/admin/tournaments/[id]/stages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { name, bracket_type, best_of, stage_order, slots } = body;

  if (!name || !bracket_type) {
    return NextResponse.json({ error: "name e bracket_type são obrigatórios" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("tournament_stages")
    .insert({
      tournament_id: id,
      name,
      bracket_type,
      best_of:     best_of     ?? 3,
      stage_order: stage_order ?? 1,
      slots:       slots       ?? null,
      status:      "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stage: data }, { status: 201 });
}

// PATCH /api/admin/tournaments/[id]/stages — update uma fase existente
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { id: stageId, name, bracket_type, best_of, stage_order, slots, status } = body;

  if (!stageId) {
    return NextResponse.json({ error: "id da fase é obrigatório" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // garante que a fase pertence ao torneio
  const { data: existing } = await adminClient
    .from("tournament_stages")
    .select("id")
    .eq("id", stageId)
    .eq("tournament_id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Fase não encontrada" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (name         !== undefined) updates.name         = name;
  if (bracket_type !== undefined) updates.bracket_type = bracket_type;
  if (best_of      !== undefined) updates.best_of      = best_of;
  if (stage_order  !== undefined) updates.stage_order  = stage_order;
  if (slots        !== undefined) updates.slots        = slots;
  if (status       !== undefined) updates.status       = status;

  const { data, error } = await adminClient
    .from("tournament_stages")
    .update(updates)
    .eq("id", stageId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stage: data });
}

// DELETE /api/admin/tournaments/[id]/stages?stageId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");
  if (!stageId) {
    return NextResponse.json({ error: "stageId é obrigatório" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // garante que a fase pertence ao torneio
  const { data: existing } = await adminClient
    .from("tournament_stages")
    .select("id")
    .eq("id", stageId)
    .eq("tournament_id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Fase não encontrada" }, { status: 404 });
  }

  const { error } = await adminClient
    .from("tournament_stages")
    .delete()
    .eq("id", stageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
