"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getClientSupabase } from "@/lib/supabase/client";

type Company = {
  id: string;
  name: string;
  sector: string | null;
  stage: string | null;
  arr: number | null;
  amount_invested: number | null;
  ownership_percent: number | null;
  last_round_date: string | null;
  last_round_note: string | null;
};
type KPI = { open_asks: number; intros_30d: number; valueadds_30d: number; last_update_at: string | null } | null;
type Activity = { id: string; type: 'Ask'|'Intro'|'ValueAdd'|'CompanyUpdate'; subject: string; received_at: string | null };
type Ask = { id: string; title: string; status: 'unassigned'|'in_progress'|'done'|'blocked'; priority: 'low'|'medium'|'high'; due_date: string | null; position: number };

function CompanyInner() {
  const params = useSearchParams();
  const name = params.get("name") || "Arcadia";
  const [company, setCompany] = useState<Company | null>(null);
  const [kpi, setKpi] = useState<KPI>(null);
  const [recent, setRecent] = useState<Activity[]>([]);
  const [openAsks, setOpenAsks] = useState<Ask[]>([]);
  const [financialEdits, setFinancialEdits] = useState<{
    arr: string;
    amount_invested: string;
    ownership_percent: string;
    last_round_date: string;
    last_round_note: string;
  }>({ arr: "", amount_invested: "", ownership_percent: "", last_round_date: "", last_round_note: "" });

  // Match Recent Activity card height to Financials card height
  const financialsRef = useRef<HTMLDivElement | null>(null);
  const [recentActivityHeight, setRecentActivityHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = financialsRef.current;
    if (!el || typeof window === "undefined") return;
    const update = (): void => setRecentActivityHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(() => update());
    try {
      ro.observe(el);
    } catch {
      // ignore
    }
    window.addEventListener("resize", update);
    const id = window.setTimeout(update, 0);
    return () => {
      window.removeEventListener("resize", update);
      window.clearTimeout(id);
      try {
        ro.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    const supabase = getClientSupabase();
    supabase.from("companies").select("*").eq("name", name).maybeSingle().then(async ({ data: c }) => {
      setCompany(c as Company | null);
      if (!c) return;
      const [{ data: v }, { data: acts }, { data: asks }] = await Promise.all([
        supabase.from("company_kpis").select("open_asks,intros_30d,valueadds_30d,last_update_at").eq("company_id", c.id).maybeSingle(),
        supabase.from("activities").select("id,type,subject,received_at").eq("company_id", c.id).order("received_at", { ascending: false }).limit(20),
        supabase
          .from('asks')
          .select('id,title,status,priority,due_date,position')
          .eq('company_id', c.id)
          .in('status', ['unassigned','in_progress','blocked'])
          .order('status', { ascending: true })
          .order('position', { ascending: true }),
      ]);
      setKpi((v as KPI) ?? null);
      setRecent((acts as Activity[]) ?? []);
      setOpenAsks((asks as Ask[]) ?? []);
      const formatCurrency = (value: number): string => {
        try {
          return `$${Math.round(value).toLocaleString("en-US")}`;
        } catch {
          return String(value);
        }
      };
      setFinancialEdits({
        arr: typeof c.arr === "number" ? formatCurrency(c.arr) : "",
        amount_invested: typeof c.amount_invested === "number" ? formatCurrency(c.amount_invested) : "",
        ownership_percent: typeof c.ownership_percent === "number" ? String(c.ownership_percent) : "",
        last_round_date: (c.last_round_date ?? "").slice(0, 10),
        last_round_note: c.last_round_note ?? "",
      });
    });
  }, [name]);

  const updateCompany = async (partial: Partial<Company>): Promise<void> => {
    if (!company) return;
    try {
      const res = await fetch("/api/companies/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: company.id, update: partial }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string } | Record<string, unknown>;
      if (!res.ok) {
        const missingServiceKey = typeof (data as { error?: string })?.error === 'string' && (data as { error?: string }).error?.includes('SUPABASE_SERVICE_ROLE_KEY');
        if (!missingServiceKey) {
          // eslint-disable-next-line no-console
          console.error("Update failed (server route)", data);
        }
        // Fallback to client update if server route not configured or failed
        const supabase = getClientSupabase();
        await supabase.from("companies").update(partial).eq("id", company.id);
      }
      setCompany((prev) => (prev ? { ...prev, ...partial } : prev));
    } catch {
      const supabase = getClientSupabase();
      await supabase.from("companies").update(partial).eq("id", company.id);
      setCompany((prev) => (prev ? { ...prev, ...partial } : prev));
    }
  };

  const parseCurrencyToNumber = (input: string): number | null => {
    const onlyDigits = input.replace(/[^0-9.]/g, "");
    if (onlyDigits.trim() === "") return null;
    const num = Number(onlyDigits);
    return Number.isNaN(num) ? null : Math.round(num);
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return "";
    try {
      return `$${Math.round(value).toLocaleString("en-US")}`;
    } catch {
      return String(value);
    }
  };
  const formatWhen = (iso: string | null): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#D6E4FF] to-[#0045F7]" aria-hidden="true" />
          <div>
            <div className="text-[20px] font-bold">{company?.name ?? name}</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap" aria-label="KPIs">
          {kpi ? (
            <>
              <div className="border bg-white border-[#E5E7EB] rounded-full px-3 py-2 text-[13px]">Open Asks: {kpi.open_asks}</div>
              <div className="border bg-white border-[#E5E7EB] rounded-full px-3 py-2 text-[13px]">Intros: {kpi.intros_30d}</div>
              <div className="border bg-white border-[#E5E7EB] rounded-full px-3 py-2 text-[13px]">ValueAdds: {kpi.valueadds_30d}</div>
              <div className="border bg-white border-[#E5E7EB] rounded-full px-3 py-2 text-[13px]">Last Update: {kpi.last_update_at ? new Date(kpi.last_update_at).toLocaleDateString() : '—'}</div>
            </>
          ) : null}
        </div>
      </div>

      {/* Removed tab selectors (Overview, Activity, Asks) */}

      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 items-start">
        <div className="grid gap-4 self-start">
          <div ref={financialsRef} className="grid gap-2 bg-white border border-[#E5E7EB] rounded-[12px] p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[10px] p-3">
                <div className="text-[12px] text-[#6B7280]">Revenue (ARR)</div>
                <div className="glass-input rounded-[10px] mt-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={typeof company?.arr === 'number' ? formatCurrency(company.arr) : '$0'}
                    value={financialEdits.arr}
                    disabled={!company}
                    onChange={(e) => setFinancialEdits((v) => ({ ...v, arr: e.target.value }))}
                    onBlur={async () => {
                      const nextVal = parseCurrencyToNumber(financialEdits.arr);
                      await updateCompany({ arr: nextVal });
                      setFinancialEdits((v) => ({ ...v, arr: formatCurrency(nextVal) }));
                    }}
                    className="h-10 w-full px-3 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[10px] p-3">
                <div className="text-[12px] text-[#6B7280]">Runway</div>
                <div className="glass-input rounded-[10px] mt-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={typeof company?.amount_invested === 'number' ? formatCurrency(company.amount_invested) : 'type here'}
                    value={financialEdits.amount_invested}
                    disabled={!company}
                    onChange={(e) => setFinancialEdits((v) => ({ ...v, amount_invested: e.target.value }))}
                    onBlur={async () => {
                      const nextVal = parseCurrencyToNumber(financialEdits.amount_invested);
                      await updateCompany({ amount_invested: nextVal });
                      setFinancialEdits((v) => ({ ...v, amount_invested: formatCurrency(nextVal) }));
                    }}
                    className="h-10 w-full px-3 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[10px] p-3">
                <div className="text-[12px] text-[#6B7280]">Last Funding Round Categories</div>
                <div className="glass-input rounded-[10px] mt-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={typeof company?.ownership_percent === 'number' ? `${company.ownership_percent}%` : 'Enter percent'}
                    value={financialEdits.ownership_percent}
                    disabled={!company}
                    onChange={(e) => setFinancialEdits((v) => ({ ...v, ownership_percent: e.target.value }))}
                    onBlur={async () => {
                      const trimmed = financialEdits.ownership_percent.trim().replace('%', '');
                      const nextVal = trimmed === "" ? null : Number(trimmed);
                      await updateCompany({ ownership_percent: Number.isNaN(nextVal as number) ? null : (nextVal as number | null) });
                      setFinancialEdits((v) => ({ ...v, ownership_percent: nextVal === null ? "" : `${nextVal}%` }));
                    }}
                    className="h-10 w-full px-3 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[10px] p-3">
                <div className="text-[12px] text-[#6B7280]">Last Round</div>
                <div className="glass-input rounded-[10px] mt-2">
                  <input
                    type="date"
                    value={financialEdits.last_round_date}
                    disabled={!company}
                    onChange={(e) => setFinancialEdits((v) => ({ ...v, last_round_date: e.target.value }))}
                    onBlur={async () => {
                      const nextVal = financialEdits.last_round_date.trim() === "" ? null : financialEdits.last_round_date;
                      await updateCompany({ last_round_date: nextVal });
                    }}
                    className="h-10 w-full px-3 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Standalone Notes section */}
          <div
            className="grid grid-rows-[auto_1fr] gap-2 bg-white border border-[#E5E7EB] rounded-[12px] p-3 overflow-hidden"
            style={recentActivityHeight ? { height: recentActivityHeight } : undefined}
          >
            <h3 className="m-0 text-[16px] font-semibold">Notes</h3>
            <div className="glass-input rounded-[10px] min-h-0 h-full">
              <textarea
                placeholder="Add notes, bullets, or next steps…"
                value={financialEdits.last_round_note}
                disabled={!company}
                onChange={(e) => setFinancialEdits((v) => ({ ...v, last_round_note: e.target.value }))}
                onBlur={async () => {
                  const nextVal = financialEdits.last_round_note.trim() === "" ? null : financialEdits.last_round_note;
                  await updateCompany({ last_round_note: nextVal });
                }}
                className="w-full h-full px-3 py-2 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0 resize-none text-[14px] leading-6 overflow-y-auto"
              />
            </div>
          </div>
        </div>
        <div className="grid gap-4 self-start">
          <div
            className="grid grid-rows-[auto_1fr] gap-2 bg-white border border-[#E5E7EB] rounded-[12px] p-3 shadow-sm overflow-hidden"
            style={recentActivityHeight ? { height: recentActivityHeight } : undefined}
          >
            <h3 className="m-0 text-[16px] font-semibold">Recent Activity</h3>
            {recent.length === 0 ? (
              <div className="text-[14px] text-[#6B7280] py-2">No recent activity</div>
            ) : (
              <div className="fade-bottom min-h-0 h-full">
                <ul className="list-none m-0 p-0 grid content-start gap-2 h-full overflow-y-auto overscroll-contain pr-1">
                  {recent.map((r) => (
                    <li key={r.id} className="min-w-0">
                      <Link
                        className="block h-11 px-2 border border-[#E5E7EB] rounded-[8px] text-[13px] hover:bg-[#f8fafc] flex items-center justify-between"
                        href={`/activity-detail?id=${r.id}&type=${r.type}&company=${encodeURIComponent(company?.name ?? name)}&subject=${encodeURIComponent(r.subject)}&when=${encodeURIComponent(r.received_at ? new Date(r.received_at).toLocaleString() : '—')}&email=${encodeURIComponent('https://mail.google.com/')}`}
                      >
                        <span className="truncate" title={r.subject}>{r.subject}</span>
                        <span className="ml-3 flex-none text-[#6B7280]">{formatWhen(r.received_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div
            className="grid grid-rows-[auto_1fr] gap-2 bg-white border border-[#E5E7EB] rounded-[12px] p-3 shadow-sm overflow-hidden"
            style={recentActivityHeight ? { height: recentActivityHeight } : undefined}
          >
            <h3 className="m-0 text-[16px] font-semibold">Open Asks</h3>
            {openAsks.length === 0 ? (
              <div className="text-[14px] text-[#6B7280] py-2">No open asks</div>
            ) : (
              <div className="fade-bottom min-h-0 h-full">
                <ul className="list-none m-0 p-0 grid content-start gap-2 h-full overflow-y-auto overscroll-contain pr-1">
                  {openAsks.map((a) => (
                    <li key={a.id} className="min-w-0">
                      <div className="block h-11 px-2 border border-[#E5E7EB] rounded-[8px] text-[13px] hover:bg-[#f8fafc] flex items-center truncate">
                        {a.title}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function CompanyPage() {
  return (
    <Suspense>
      <CompanyInner />
    </Suspense>
  );
}


