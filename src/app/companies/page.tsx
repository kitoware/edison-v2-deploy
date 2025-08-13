"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getClientSupabase } from "@/lib/supabase/client";

type CompanyCard = {
  id: string;
  name: string;
  arr: number | null;
  amount_invested: number | null;
  ownership_percent: number | null;
  open_asks?: number;
  intros_30d?: number;
};

export default function CompaniesPage() {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [companies, setCompanies] = useState<CompanyCard[]>([]);

  type HighlightRect = { left: number; top: number; width: number; height: number } | null;
  const [highlightRect, setHighlightRect] = useState<HighlightRect>(null);
  const tablistRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<"cards" | "table", HTMLButtonElement | null>>({
    cards: null,
    table: null,
  });

  useEffect(() => {
    function updateRect(): void {
      const container = tablistRef.current;
      const activeEl = tabRefs.current[view];
      if (!container || !activeEl) {
        setHighlightRect(null);
        return;
      }
      const containerBox = container.getBoundingClientRect();
      const activeBox = activeEl.getBoundingClientRect();
      setHighlightRect({
        left: activeBox.left - containerBox.left,
        top: activeBox.top - containerBox.top,
        width: activeBox.width,
        height: activeBox.height,
      });
    }

    updateRect();
    const ro = new ResizeObserver(() => updateRect());
    if (tablistRef.current) ro.observe(tablistRef.current);
    window.addEventListener("resize", updateRect);
    const id = window.setTimeout(updateRect, 0);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.clearTimeout(id);
      ro.disconnect();
    };
  }, [view]);
  useEffect(() => {
    const supabase = getClientSupabase();
    Promise.all([
      supabase
        .from("companies")
        .select("id, name, arr, amount_invested, ownership_percent")
        .order("name", { ascending: true }),
      supabase.from("company_kpis").select("company_id, open_asks, intros_30d"),
    ]).then(([c, k]) => {
      const companyRows = c.data ?? [];
      const kpiRows = k.data ?? [];
      const byId: Record<string, CompanyCard> = {};
      for (const row of companyRows) byId[row.id] = { ...row } as CompanyCard;
      for (const v of kpiRows) {
        const target = byId[v.company_id];
        if (target) {
          target.open_asks = v.open_asks;
          target.intros_30d = v.intros_30d;
        }
      }
      setCompanies(Object.values(byId).sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  return (
    <div className="grid gap-4">
      <div
        ref={tablistRef}
        className="relative flex gap-2"
        role="tablist"
        aria-label="View toggle"
      >
        <div
          aria-hidden
          className={`glass-pill-active glass-pill-highlight rounded-full ${
            highlightRect ? "opacity-100" : "opacity-0"
          }`}
          style={
            highlightRect
              ? {
                  transform: `translate3d(${highlightRect.left}px, ${highlightRect.top}px, 0)`,
                  width: `${highlightRect.width}px`,
                  height: `${highlightRect.height}px`,
                }
              : undefined
          }
        />
        <button
          ref={(el) => {
            tabRefs.current.cards = el;
          }}
          onClick={() => setView("cards")}
          className={`relative z-[1] h-9 px-3 rounded-full border border-transparent bg-transparent ${
            view === "cards" ? "text-[#0045F7]" : "text-[#6B7280] hover:text-[#0045F7]"
          }`}
          role="tab"
          aria-selected={view === "cards"}
        >
          Cards
        </button>
        <button
          ref={(el) => {
            tabRefs.current.table = el;
          }}
          onClick={() => setView("table")}
          className={`relative z-[1] h-9 px-3 rounded-full border border-transparent bg-transparent ${
            view === "table" ? "text-[#0045F7]" : "text-[#6B7280] hover:text-[#0045F7]"
          }`}
          role="tab"
          aria-selected={view === "table"}
        >
          Table
        </button>
      </div>

      {view === "cards" ? (
        <section className="grid grid-cols-12 gap-4" aria-label="Company cards" id="cardsView" role="tabpanel">
          {companies.map((c) => (
            <article key={c.id} className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white border border-[#E5E7EB] rounded-[12px] p-3 grid gap-2 shadow-sm">
              <div className="flex items-center gap-2"><div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#D6E4FF] to-[#0045F7]" aria-hidden="true" /><div className="font-semibold">{c.name}</div></div>
              <div className="flex flex-wrap gap-2 text-[12px] text-[#4B5563]">
                <div><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9ca3af] mr-1" />Open Asks: {c.open_asks ?? 0}</div>
                <div><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9ca3af] mr-1" />ARR: {typeof c.arr === 'number' ? `$${(c.arr/1000000).toFixed(1)}M` : '—'}</div>
                <div><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9ca3af] mr-1" />Ownership: {typeof c.ownership_percent === 'number' ? `${c.ownership_percent}%` : '—'}</div>
              </div>
              <Link className="text-[#0045F7] font-semibold text-[13px]" href={`/company?name=${encodeURIComponent(c.name)}`}>Open company →</Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden" aria-label="Company table" id="tableView" role="tabpanel">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F3F4F6] text-left text-[14px] text-[#6B7280]">
                {["Name","Open Asks","Intros","ARR","Amount Invested","Ownership %"].map((h) => (
                  <th key={h} className="p-3 border-b border-[#E5E7EB]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 border-b border-[#E5E7EB]"><Link className="text-[#0045F7]" href={`/company?name=${encodeURIComponent(c.name)}`}>{c.name}</Link></td>
                  <td className="p-3 border-b border-[#E5E7EB]">{c.open_asks ?? 0}</td>
                  <td className="p-3 border-b border-[#E5E7EB]">{c.intros_30d ?? 0}</td>
                  <td className="p-3 border-b border-[#E5E7EB]">{typeof c.arr === 'number' ? `$${(c.arr/1000000).toFixed(1)}M` : '—'}</td>
                  <td className="p-3 border-b border-[#E5E7EB]">{typeof c.amount_invested === 'number' ? `$${(c.amount_invested/1000000).toFixed(1)}M` : '—'}</td>
                  <td className="p-3 border-b border-[#E5E7EB]">{typeof c.ownership_percent === 'number' ? `${c.ownership_percent}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}


