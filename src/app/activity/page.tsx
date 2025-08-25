"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getClientSupabase } from "@/lib/supabase/client";

type Contributor = "Brandon" | "Adam";

type ActivityRow = {
  id: string;
  type: "Ask" | "Intro" | "ValueAdd" | "CompanyUpdate";
  company: string;
  subject: string;
  when: string;
  ask_id: string | null;
  actors: Contributor[];
};

const FILTERS = ["All", "Ask", "Intro", "Value Add", "Company Update"] as const;
type Filter = (typeof FILTERS)[number];

export default function ActivityPage(): React.ReactElement {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const filterToTypeMap: Partial<Record<Filter, ActivityRow["type"]>> = {
    Ask: "Ask",
    Intro: "Intro",
    "Value Add": "ValueAdd",
    "Company Update": "CompanyUpdate",
  };
  const typeToLabelMap: Record<ActivityRow["type"], string> = {
    Ask: "Ask",
    Intro: "Intro",
    ValueAdd: "Value Add",
    CompanyUpdate: "Company Update",
  };

  // Modal + form state (mirrors the Add Task modal on home page)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [formType, setFormType] = useState<ActivityRow["type"]>("Intro");
  const [formCompanyId, setFormCompanyId] = useState<string>("");
  const [formSubject, setFormSubject] = useState<string>("");
  const [formWhen, setFormWhen] = useState<string>("");
  const [formContributors, setFormContributors] = useState<Contributor[]>([]);

  const TYPE_OPTIONS: Array<{ value: ActivityRow["type"]; label: string }> = useMemo(
    () => [
      { value: "Ask", label: "Ask" },
      { value: "Intro", label: "Intro" },
      { value: "ValueAdd", label: "Value Add" },
      { value: "CompanyUpdate", label: "Company Update" },
    ],
    []
  );

  const typeRef = useRef<HTMLDivElement | null>(null);
  const companyRef = useRef<HTMLDivElement | null>(null);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = (): void => {
    setFormType("Intro");
    setFormCompanyId("");
    setFormSubject("");
    setFormWhen("");
    setFormContributors([]);
  };

  const handleOpenModal = (): void => {
    resetForm();
    setIsModalOpen(true);
  };
  const handleCloseModal = (): void => setIsModalOpen(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (isTypeOpen && typeRef.current && target && !typeRef.current.contains(target)) {
        setIsTypeOpen(false);
      }
      if (isCompanyOpen && companyRef.current && target && !companyRef.current.contains(target)) {
        setIsCompanyOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isTypeOpen, isCompanyOpen]);

  // Load companies for selector
  useEffect(() => {
    const supabase = getClientSupabase();
    (async () => {
      try {
        const { data } = await supabase
          .from("companies")
          .select("id,name")
          .order("name", { ascending: true });
        setCompanies((data as Array<{ id: string; name: string }>) ?? []);
      } catch {
        setCompanies([]);
      }
    })();
  }, []);

  // Activities feed loader + realtime updates
  useEffect(() => {
    const supabase = getClientSupabase();

    type ActivityQueryRow = {
      id: string;
      type: ActivityRow["type"];
      subject: string;
      received_at: string | null;
      ask_id: string | null;
      companies?: { name: string } | { name: string }[] | null;
      actors?: Contributor[] | null;
    };

    function extractCompanyName(input: ActivityQueryRow["companies"]): string | null {
      if (!input) return null;
      if (Array.isArray(input)) return input[0]?.name ?? null;
      return (input as { name: string }).name ?? null;
    }

    let isMounted = true;
    const refresh = async (): Promise<void> => {
      try {
        const res = await supabase
          .from("activities")
          .select("id, type, subject, received_at, ask_id, companies(name), actors")
          .order("received_at", { ascending: false })
          .limit(100);
        const activities = (res.data ?? []) as ActivityQueryRow[];
        if (!isMounted) return;
        const activityRows: ActivityRow[] = activities.map((r) => ({
          id: r.id,
          type: r.type,
          subject: r.subject,
          company: extractCompanyName(r.companies) ?? "—",
          when: r.received_at ? new Date(r.received_at).toLocaleString() : "—",
          ask_id: r.ask_id ?? null,
          actors: Array.isArray(r.actors) ? (r.actors as Contributor[]) : [],
        }));
        setRows(activityRows);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load activity feed:", err);
        if (isMounted) setRows([]);
      }
    };

    void refresh();

    const channel = supabase
      .channel("activities-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;
    const supabase = getClientSupabase();
    const subject = formSubject.trim();
    if (!subject || !formCompanyId) return;
    setIsSubmitting(true);

    // Optimistic add
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const companyName = companies.find((c) => c.id === formCompanyId)?.name ?? "—";
    const whenDisplay = formWhen
      ? new Date(formWhen + "T12:00:00").toLocaleString()
      : new Date().toLocaleString();
    setRows((prev) => [
      { id: tempId, type: formType, subject, company: companyName, when: whenDisplay, ask_id: null, actors: formContributors.slice() },
      ...prev,
    ]);
    setIsModalOpen(false);
    resetForm();

    try {
      const receivedAtIso = formWhen
        ? new Date(formWhen + "T12:00:00").toISOString()
        : new Date().toISOString();

      if (formType === "Ask") {
        // Build ask title consistent with Kanban cards (Company — Subject)
        const askTitle = `${companyName} — ${subject}`;
        // 1) Resolve or create Ask row and capture its id
        const { data: existingAskRows, error: existingAskError } = await supabase
          .from('asks')
          .select('id')
          .eq('title', askTitle)
          .limit(1);
        if (existingAskError) {
          // eslint-disable-next-line no-console
          console.error('Failed to check for existing ask:', existingAskError);
        }
        let askId: string | undefined = Array.isArray(existingAskRows) && existingAskRows[0]?.id ? String(existingAskRows[0].id) : undefined;

        if (!askId) {
          const { data: posRows, error: selectError } = await supabase
            .from('asks')
            .select('position')
            .eq('status', 'unassigned')
            .order('position', { ascending: false })
            .limit(1);
          if (selectError) {
            // eslint-disable-next-line no-console
            console.error('Failed to determine next position for new ask from activity:', selectError);
          }
          const lastPosition = Array.isArray(posRows) && posRows.length > 0 ? Number(posRows[0]?.position ?? 0) : 0;
          const nextPosition = Number.isFinite(lastPosition) ? lastPosition + 1 : 1;

          const { data: insertedAsk, error: askInsertError } = await supabase
            .from('asks')
            .insert({
              title: askTitle,
              priority: 'medium',
              status: 'unassigned',
              due_date: null,
              position: nextPosition,
              company_id: formCompanyId || null,
              contributors: formContributors.slice(),
            })
            .select('id')
            .single();
          if (askInsertError) throw askInsertError;
          askId = insertedAsk?.id ? String(insertedAsk.id) : undefined;
        } else {
          // Existing ask: update contributors
          try {
            await supabase.from('asks').update({ contributors: formContributors.slice() }).eq('id', askId);
          } catch (uErr) {
            // eslint-disable-next-line no-console
            console.error('Failed to update contributors on existing ask:', uErr);
          }
        }

        // 2) Upsert corresponding Activity row for the Ask
        type ActivitySelectRow = { id: string; type: ActivityRow["type"]; subject: string; received_at: string | null; companies?: { name: string } | { name: string }[] | null };
        let finalActivity: ActivitySelectRow | null = null;
        if (askId) {
          const { data: existingActs } = await supabase
            .from('activities')
            .select('id, type, subject, received_at, companies(name), actors')
            .eq('ask_id', askId)
            .limit(1);
          if (Array.isArray(existingActs) && existingActs[0]) {
            finalActivity = existingActs[0] as ActivitySelectRow;
            // Update actors on existing activity to reflect selection
            try {
              await supabase.from('activities').update({ actors: formContributors.slice() }).eq('id', finalActivity.id);
            } catch (actUpdErr) {
              // eslint-disable-next-line no-console
              console.error('Failed to update actors on existing activity:', actUpdErr);
            }
          } else {
            const { data: insertedAct, error: actInsertError } = await supabase
              .from('activities')
              .insert({
                type: 'Ask',
                subject: askTitle,
                company_id: formCompanyId || null,
                ask_id: askId,
                received_at: receivedAtIso,
                actors: formContributors.slice(),
              })
              .select('id, type, subject, received_at, companies(name), actors')
              .single();
            if (actInsertError) throw actInsertError;
            finalActivity = insertedAct as ActivitySelectRow;
          }
        }

        // Replace optimistic temp with the canonical row if available
        if (finalActivity) {
          const insertedWhen = finalActivity.received_at ? new Date(finalActivity.received_at).toLocaleString() : whenDisplay;
          const insertedCompany = Array.isArray(finalActivity.companies)
            ? (finalActivity.companies[0]?.name ?? companyName)
            : (finalActivity.companies?.name ?? companyName);
          setRows((prev) => prev.map((r) => r.id === tempId ? {
            id: String(finalActivity.id),
            type: finalActivity.type,
            subject: finalActivity.subject,
            company: insertedCompany,
            when: insertedWhen,
            ask_id: askId ?? null,
            actors: Array.isArray((finalActivity as any).actors) ? ((finalActivity as any).actors as Contributor[]) : formContributors.slice(),
          } : r));
        }
      } else {
        // Non-Ask activities: existing behavior
        const { data, error } = await supabase
          .from('activities')
          .insert({
            type: formType,
            subject,
            company_id: formCompanyId || null,
            received_at: receivedAtIso,
            actors: formContributors.slice(),
          })
          .select('id, type, subject, received_at, ask_id, companies(name), actors');

        if (error) throw error;

        const inserted = Array.isArray(data) && data[0] ? data[0] as {
          id: string; type: ActivityRow["type"]; subject: string; received_at: string | null; ask_id?: string | null; companies?: { name: string } | { name: string }[] | null; actors?: Contributor[] | null;
        } : null;
        if (inserted) {
          const insertedWhen = inserted.received_at ? new Date(inserted.received_at).toLocaleString() : whenDisplay;
          const insertedCompany = Array.isArray(inserted.companies)
            ? (inserted.companies[0]?.name ?? companyName)
            : (inserted.companies?.name ?? companyName);
          setRows((prev) => prev.map((r) => r.id === tempId ? {
            id: inserted.id,
            type: inserted.type,
            subject: inserted.subject,
            company: insertedCompany,
            when: insertedWhen,
            ask_id: inserted.ask_id ?? null,
            actors: Array.isArray(inserted.actors) ? (inserted.actors as Contributor[]) : formContributors.slice(),
          } : r));
        }
      }
      // If realtime refresh fires, it will override this mapping with source of truth.
    } catch (err) {
      // Roll back optimistic add
      setRows((prev) => prev.filter((r) => r.id !== tempId));
      // eslint-disable-next-line no-console
      console.error("Failed to add activity:", err);
      alert("Failed to add activity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const supabase = getClientSupabase();
    const previous = rows;
    // Optimistic remove
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      // Before deleting the activity, if it's an Ask with a linked ask_id, also delete the Ask
      const target = rows.find((r) => r.id === id);
      if (target && target.type === 'Ask' && target.ask_id) {
        try {
          await supabase.from('asks').delete().eq('id', target.ask_id);
        } catch (askErr) {
          // eslint-disable-next-line no-console
          console.error('Failed to delete linked ask for activity:', askErr);
        }
      }

      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
      // realtime will refresh; if not, state already reflects deletion
    } catch (err) {
      // Roll back
      setRows(previous);
      // eslint-disable-next-line no-console
      console.error("Failed to delete activity:", err);
      alert("Failed to delete activity. Please try again.");
    }
  };

  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const navRef = useRef<HTMLElement | null>(null);
  const chipRefs = useRef<Record<Filter, HTMLButtonElement | null>>({
    All: null,
    Ask: null,
    Intro: null,
    "Value Add": null,
    "Company Update": null,
  });

  const [highlightRect, setHighlightRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    function updateRect(): void {
      const navEl = navRef.current;
      const activeEl = chipRefs.current[activeFilter];
      if (!navEl || !activeEl) {
        setHighlightRect(null);
        return;
      }
      const navBox = navEl.getBoundingClientRect();
      const elBox = activeEl.getBoundingClientRect();
      const left = elBox.left - navBox.left;
      const top = elBox.top - navBox.top;
      setHighlightRect({ left, top, width: elBox.width, height: elBox.height });
    }

    updateRect();
    const ro = new ResizeObserver(() => updateRect());
    if (navRef.current) ro.observe(navRef.current);
    window.addEventListener("resize", updateRect);
    const id = window.setTimeout(updateRect, 0);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.clearTimeout(id);
      ro.disconnect();
    };
  }, [activeFilter]);

  const displayedRows = useMemo(() => {
    if (activeFilter === "All") return rows;
    const mappedType = filterToTypeMap[activeFilter];
    if (!mappedType) return rows;
    return rows.filter((r) => r.type === mappedType);
  }, [activeFilter, rows]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <nav
          ref={navRef}
          className="relative flex flex-wrap gap-2 min-w-0"
          aria-label="Activity categories"
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
          {FILTERS.map((filter) => {
            const isActive = filter === activeFilter;
            return (
              <button
                key={filter}
                ref={(el) => {
                  chipRefs.current[filter] = el;
                }}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`relative z-[1] inline-flex items-center h-9 px-3 rounded-full text-[14px] font-semibold transition-colors ${
                  isActive ? "text-[#0045F7]" : "text-[#4B5563] hover:text-[#0045F7]"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          className="h-9 px-3 rounded-full border border-[#E5E7EB] bg-[#F3F4F6] text-[#111827] font-semibold glass-hover"
          onClick={handleOpenModal}
        >
          Add activity
        </button>
      </div>

      <section className="grid gap-3">
        <table className="w-full border-collapse bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden">
          <thead>
            <tr className="bg-[#F3F4F6] text-left text-[14px] text-[#6B7280]">
              <th className="p-3 border-b border-[#E5E7EB]">Category</th>
              <th className="p-3 border-b border-[#E5E7EB]">Company</th>
              <th className="p-3 border-b border-[#E5E7EB]">Subject</th>
              <th className="p-3 border-b border-[#E5E7EB]">By</th>
              <th className="p-3 border-b border-[#E5E7EB]">Received</th>
              <th className="p-3 border-b border-[#E5E7EB] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r) => (
              <tr key={r.id} className="odd:bg-[#FBFBFB] hover:bg-[#FAFAFA]">
                <td className="p-3 border-b border-[#E5E7EB]">
                  <span className="inline-block px-2 py-0.5 rounded-full border text-[12px] text-[#6B7280]">
                    {typeToLabelMap[r.type]}
                  </span>
                </td>
                <td className="p-3 border-b border-[#E5E7EB]">
                  {r.company && r.company !== "—" ? (
                    <Link className="text-[#0045F7] font-medium" href={`/company?name=${encodeURIComponent(r.company)}`}>
                      {r.company}
                    </Link>
                  ) : (
                    <span>{r.company}</span>
                  )}
                </td>
                <td className="p-3 border-b border-[#E5E7EB]">
                  <Link
                    className="text-[#0045F7]"
                    href={`/activity-detail?id=${r.id}&type=${r.type}&company=${encodeURIComponent(r.company)}&subject=${encodeURIComponent(r.subject)}&when=${encodeURIComponent(r.when)}&email=${encodeURIComponent("https://mail.google.com/")}`}
                  >
                    {r.subject}
                  </Link>
                </td>
                <td className="p-3 border-b border-[#E5E7EB]">
                  {Array.isArray(r.actors) && r.actors.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {r.actors.map((a) => (
                        <span key={a} className="inline-flex items-center px-2 py-0.5 rounded-full border text-[12px] border-[#E5E7EB] text-[#4B5563]">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>—</span>
                  )}
                </td>
                <td className="p-3 border-b border-[#E5E7EB]">{r.when}</td>
                <td className="p-3 border-b border-[#E5E7EB]">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-[#EF4444] hover:underline text-[13px]"
                      onClick={() => {
                        if (window.confirm("Delete this activity?")) {
                          void handleDelete(r.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-md glass-modal-surface rounded-[16px] shadow-xl">
            <div className="p-5 border-b border-white/40 flex items-center justify-between">
              <h3 className="m-0 text-[16px] font-semibold">Add Activity</h3>
              <button
                type="button"
                className="text-[13px] text-[#0045F7] font-semibold"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
            <form className="p-5 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-3">
                <div className="grid gap-1" ref={typeRef}>
                  <label className="text-[12px] text-[#4B5563]" htmlFor="activity_type">Type</label>
                  <button
                    id="activity_type"
                    type="button"
                    className="h-10 px-3 rounded-[10px] border border-white/60 bg-white/70 backdrop-blur-md shadow-sm flex items-center justify-between gap-3 hover:bg-white/80"
                    aria-haspopup="listbox"
                    aria-expanded={isTypeOpen}
                    onClick={() => {
                      setIsTypeOpen((v) => !v);
                      setIsCompanyOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2 text-[13px] text-[#111827]">
                      {TYPE_OPTIONS.find((t) => t.value === formType)?.label}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isTypeOpen ? (
                    <div className="relative">
                      <div className="absolute z-10 mt-1 w-full rounded-[10px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-lg overflow-hidden">
                        <ul role="listbox" className="max-h-56 overflow-auto">
                          {TYPE_OPTIONS.map((opt) => (
                            <li key={opt.value} role="option" aria-selected={formType === opt.value}>
                              <button
                                type="button"
                                className={`w-full h-10 px-3 text-left flex items-center justify-between gap-3 hover:bg-black/5 ${formType === opt.value ? "bg-black/5" : ""}`}
                                onClick={() => {
                                  setFormType(opt.value);
                                  setIsTypeOpen(false);
                                }}
                              >
                                <span className="flex items-center gap-2 text-[13px]">
                                  {opt.label}
                                </span>
                                {formType === opt.value ? (
                                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M16 6L8.5 13.5L5 10" stroke="#0045F7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : null}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-1" ref={companyRef}>
                  <label className="text-[12px] text-[#4B5563]" htmlFor="activity_company">Company</label>
                  {/* Hidden input for native required validation */}
                  <input type="hidden" name="company_id" value={formCompanyId} required />
                  <button
                    id="activity_company"
                    type="button"
                    className="h-10 px-3 rounded-[10px] border border-white/60 bg-white/70 backdrop-blur-md shadow-sm flex items-center justify-between gap-3 hover:bg-white/80"
                    aria-haspopup="listbox"
                    aria-expanded={isCompanyOpen}
                    onClick={() => {
                      setIsCompanyOpen((v) => !v);
                      setIsTypeOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2 text-[13px] text-[#111827]">
                      {formCompanyId
                        ? (companies.find((c) => c.id === formCompanyId)?.name ?? "Select a company")
                        : (companies.length === 0 ? "Loading companies…" : "Select a company")}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isCompanyOpen ? (
                    <div className="relative">
                      <div className="absolute z-10 mt-1 w-full rounded-[10px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-lg overflow-hidden">
                        <ul role="listbox" className="max-h-56 overflow-auto">
                          {(companies.length === 0 ? [{ id: "", name: "Loading…" }] : companies).map((opt) => (
                            <li key={opt.id || "loading"} role="option" aria-selected={formCompanyId === opt.id}>
                              <button
                                type="button"
                                disabled={!opt.id}
                                className={`w-full h-10 px-3 text-left flex items-center justify-between gap-3 hover:bg-black/5 ${formCompanyId === opt.id ? "bg-black/5" : ""}`}
                                onClick={() => {
                                  if (!opt.id) return;
                                  setFormCompanyId(opt.id);
                                  setIsCompanyOpen(false);
                                }}
                              >
                                <span className="flex items-center gap-2 text-[13px]">
                                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#9ca3af]" />
                                  {opt.name}
                                </span>
                                {formCompanyId === opt.id ? (
                                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M16 6L8.5 13.5L5 10" stroke="#0045F7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : null}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-1">
                  <label className="text-[12px] text-[#4B5563]" htmlFor="activity_subject">Subject</label>
                  <div className="glass-input rounded-[10px]">
                    <input
                      id="activity_subject"
                      type="text"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      required
                      placeholder="Activity subject"
                      className="h-10 w-full px-3 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-[12px] text-[#4B5563]" htmlFor="activity_when">Received date</label>
                <div className="glass-input rounded-[10px]">
                  <input
                    id="activity_when"
                    type="date"
                    value={formWhen}
                    onChange={(e) => setFormWhen(e.target.value)}
                    className="h-10 w-full px-3 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <span className="text-[12px] text-[#4B5563]">By</span>
                <div className="flex items-center gap-2">
                  {(["Brandon", "Adam"] as Contributor[]).map((person) => {
                    const isActive = formContributors.includes(person);
                    return (
                      <button
                        key={person}
                        type="button"
                        className={`h-8 px-3 rounded-full border text-[12px] transition-colors ${
                          isActive
                            ? "border-[#3B82F6] text-[#0045F7] bg-[#EFF6FF]"
                            : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6]"
                        }`}
                        onClick={() => {
                          setFormContributors((prev) => prev.includes(person)
                            ? prev.filter((p) => p !== person)
                            : [...prev, person]
                          );
                        }}
                      >
                        {person}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="h-10 px-4 rounded-[8px] border border-[#E5E7EB] bg-white/70 hover:bg-white"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-[8px] bg-[#0045F7] text-white font-semibold shadow-sm hover:bg-[#003AD6]"
                  disabled={isSubmitting}
                >
                  Add activity
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}


