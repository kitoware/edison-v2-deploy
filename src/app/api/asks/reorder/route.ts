import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

type Move = { id: string; status: 'unassigned'|'in_progress'|'done'|'blocked'; position: number };

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  const body = await req.json().catch(() => ({}));
  const moves: Move[] = Array.isArray(body?.moves) ? body.moves : [];

  // Best-effort updates; if needed, this can be done in a Postgres function for atomic reordering
  for (const m of moves) {
    if (!m?.id || !m?.status || typeof m?.position !== 'number') continue;
    await supabase
      .from('asks')
      .update({ status: m.status, position: m.position })
      .eq('id', m.id);
  }

  return NextResponse.json({ ok: true });
}


