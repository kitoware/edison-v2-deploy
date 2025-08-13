import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Patch = Partial<{
  arr: number | null;
  amount_invested: number | null;
  ownership_percent: number | null;
  last_round_date: string | null;
  last_round_note: string | null;
}>;

export async function POST(req: Request) {
  try {
    const { id, update } = (await req.json()) as { id?: string; update?: Patch };
    if (!id || !update || typeof update !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    if (!serviceKey) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

    // Whitelist keys to prevent accidental writes
    const allowed: (keyof Patch)[] = [
      "arr",
      "amount_invested",
      "ownership_percent",
      "last_round_date",
      "last_round_note",
    ];
    const safeUpdate: Patch = {};
    if (allowed.includes("arr") && typeof update.arr !== "undefined") safeUpdate.arr = update.arr;
    if (allowed.includes("amount_invested") && typeof update.amount_invested !== "undefined") safeUpdate.amount_invested = update.amount_invested;
    if (allowed.includes("ownership_percent") && typeof update.ownership_percent !== "undefined") safeUpdate.ownership_percent = update.ownership_percent;
    if (allowed.includes("last_round_date") && typeof update.last_round_date !== "undefined") safeUpdate.last_round_date = update.last_round_date;
    if (allowed.includes("last_round_note") && typeof update.last_round_note !== "undefined") safeUpdate.last_round_note = update.last_round_note;
    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const supabase = createClient(url, serviceKey);
    const { error } = await supabase
      .from("companies")
      .update(safeUpdate)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


