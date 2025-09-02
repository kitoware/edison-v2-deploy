"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import KanbanBoard, { KanbanBoardHandle, Priority, StatusKey } from "./KanbanBoard";
import { getClientSupabase } from "@/lib/supabase/client";

export default function Home() {
  const kanbanRef = useRef<KanbanBoardHandle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [formCompanyId, setFormCompanyId] = useState<string>("");
  const [formSubject, setFormSubject] = useState<string>("");
  const [formPriority, setFormPriority] = useState<Priority>("medium");
  const [formStatus, setFormStatus] = useState<StatusKey>("unassigned");
  const [formDueDate, setFormDueDate] = useState<string>("");
  const [intros, setIntros] = useState<Array<[string, string]>>([]);
  const [valueAdds, setValueAdds] = useState<Array<[string, string]>>([]);
  const [companyUpdates, setCompanyUpdates] = useState<Array<[string, string]>>([]);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companyKpis, setCompanyKpis] = useState<Record<string, { open_asks: number; last_update_at: string | null }>>({});
  const priorityRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const companyRef = useRef<HTMLDivElement | null>(null);

  const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; dot: string }> = [
    { value: "low", label: "Low", dot: "bg-[#16a34a]" },
    { value: "medium", label: "Medium", dot: "bg-[#d97706]" },
    { value: "high", label: "High", dot: "bg-[#dc2626]" },
  ];

  const STATUS_OPTIONS: Array<{ value: StatusKey; label: string; dot: string }> = [
    { value: "unassigned", label: "Unassigned", dot: "bg-[#9ca3af]" },
    { value: "in_progress", label: "In progress", dot: "bg-[#3B82F6]" },
    { value: "done", label: "Done", dot: "bg-[#16a34a]" },
    { value: "blocked", label: "Blocked", dot: "bg-[#dc2626]" },
  ];

  // Persist Add Task draft locally so edits survive refreshes
  const ADD_TASK_DRAFT_KEY = "home:add_task_draft:v1";

  type AddTaskDraft = {
    companyId: string;
    subject: string;
    priority: Priority;
    status: StatusKey;
    dueDate: string;
  };

  const resetForm = (): void => {
    setFormSubject("");
    setFormCompanyId("");
    setFormPriority("medium");
    setFormStatus("unassigned");
    setFormDueDate("");
  };

  const handleOpenModal = (): void => {
    resetForm();
    setIsModalOpen(true);
  };
  const handleCloseModal = (): void => setIsModalOpen(false);

  const dueDateMin = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(ADD_TASK_DRAFT_KEY) : null;
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<AddTaskDraft> | null;
      if (!draft || typeof draft !== "object") return;
      if (typeof draft.companyId === "string") setFormCompanyId(draft.companyId);
      if (typeof draft.subject === "string") setFormSubject(draft.subject);
      if (draft.priority === "low" || draft.priority === "medium" || draft.priority === "high") setFormPriority(draft.priority);
      if (draft.status === "unassigned" || draft.status === "in_progress" || draft.status === "done" || draft.status === "blocked") setFormStatus(draft.status);
      if (typeof draft.dueDate === "string") setFormDueDate(draft.dueDate);
    } catch {
      // ignore bad drafts
    }
  }, []);

  // Save draft when fields change
  useEffect(() => {
    try {
      const draft: AddTaskDraft = {
        companyId: formCompanyId,
        subject: formSubject,
        priority: formPriority,
        status: formStatus,
        dueDate: formDueDate,
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ADD_TASK_DRAFT_KEY, JSON.stringify(draft));
      }
    } catch {
      // noop
    }
  }, [formCompanyId, formSubject, formPriority, formStatus, formDueDate]);

  // Load KPIs for companies shown in the grid
  useEffect(() => {
    const supabase = getClientSupabase();
    type CompanyKpiRow = { company_id: string; open_asks: number | null; last_update_at: string | null };
    (async () => {
      try {
        if (companies.length === 0) {
          setCompanyKpis({});
          return;
        }
        const companyIds = companies.map((c) => c.id);
        const { data } = await supabase
          .from("company_kpis")
          .select("company_id,open_asks,last_update_at")
          .in("company_id", companyIds);
        const map: Record<string, { open_asks: number; last_update_at: string | null }> = {};
        ((data as CompanyKpiRow[] | null | undefined) ?? []).forEach((row) => {
          map[row.company_id] = {
            open_asks: typeof row.open_asks === "number" ? row.open_asks : 0,
            last_update_at: row.last_update_at ?? null,
          };
        });
        setCompanyKpis(map);
      } catch {
        setCompanyKpis({});
      }
    })();
  }, [companies]);

  const formatLastTouch = (iso: string | null): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    return diffDays <= 0 ? "Today" : `${diffDays}d`;
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const dueTimestamp = formDueDate
      ? new Date(formDueDate + "T12:00:00").getTime()
      : null;
    const selectedCompany = companies.find((c) => c.id === formCompanyId) || null;
    const subject = formSubject.trim();
    const title = `${selectedCompany?.name ?? ""}${selectedCompany ? " — " : ""}${subject}`.trim();
    kanbanRef.current?.addCard({
      title,
      priority: formPriority,
      status: formStatus,
      dueDate: dueTimestamp ?? null,
      companyId: formCompanyId || null,
    });
    setIsModalOpen(false);
    resetForm();
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ADD_TASK_DRAFT_KEY);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (isPriorityOpen && priorityRef.current && target && !priorityRef.current.contains(target)) {
        setIsPriorityOpen(false);
      }
      if (isStatusOpen && statusRef.current && target && !statusRef.current.contains(target)) {
        setIsStatusOpen(false);
      }
      if (isCompanyOpen && companyRef.current && target && !companyRef.current.contains(target)) {
        setIsCompanyOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isPriorityOpen, isStatusOpen, isCompanyOpen]);

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

  // Load and live-update Overdue Asks count
  useEffect(() => {
    const supabase = getClientSupabase();
    let isMounted = true;

    const refreshOverdueCount = async (): Promise<void> => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { count, error } = await supabase
          .from("asks")
          .select("id", { count: "exact", head: true })
          .lt("due_date", today)
          .neq("status", "done");
        if (!error && isMounted) setOverdueCount(count ?? 0);
      } catch {
        if (isMounted) setOverdueCount(0);
      }
    };

    // Initial load
    refreshOverdueCount();

    // Subscribe to any changes on asks to keep count live
    const channel = supabase
      .channel("asks-overdue")
      .on("postgres_changes", { event: "*", schema: "public", table: "asks" }, () => {
        void refreshOverdueCount();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Load and live-update sidebar tiles (Intros, Value Adds, Company Updates)
  useEffect(() => {
    const supabase = getClientSupabase();
    type ActivityQueryRow = {
      id: string;
      type: 'Ask' | 'Intro' | 'ValueAdd' | 'CompanyUpdate';
      subject: string;
      received_at: string | null;
      email_url: string | null;
      companies?: { name: string } | { name: string }[] | null;
    };

    function extractCompanyName(input: ActivityQueryRow["companies"]): string | null {
      if (!input) return null;
      if (Array.isArray(input)) return input[0]?.name ?? null;
      return (input as { name: string }).name ?? null;
    }

    let isMounted = true;
    const refresh = async (): Promise<void> => {
      try {
        const limitPerType = 5;
        const queryFor = (type: 'Intro' | 'ValueAdd' | 'CompanyUpdate') =>
          supabase
            .from('activities')
            .select('id, type, subject, received_at, email_url, companies(name)')
            .eq('type', type)
            .order('received_at', { ascending: false })
            .limit(limitPerType);

        const [introRes, vaRes, cuRes] = await Promise.all([
          queryFor('Intro'),
          queryFor('ValueAdd'),
          queryFor('CompanyUpdate'),
        ]);

        if (!isMounted) return;

        const mapRows = (
          res: { data: unknown } | { data: ActivityQueryRow[] } | null | undefined,
          type: 'Intro' | 'ValueAdd' | 'CompanyUpdate'
        ): Array<[string, string]> => {
          const rows = ((res as { data?: ActivityQueryRow[] } | null | undefined)?.data ?? []) as ActivityQueryRow[];
          return rows.map((r) => {
            const company = extractCompanyName(r.companies) ?? '—';
            const whenDisplay = r.received_at ? new Date(r.received_at).toLocaleString() : '—';
            const href = `/activity-detail?id=${encodeURIComponent(r.id)}&type=${encodeURIComponent(type)}&company=${encodeURIComponent(company)}&subject=${encodeURIComponent(r.subject)}&when=${encodeURIComponent(whenDisplay)}&email=${encodeURIComponent(r.email_url ?? 'https://mail.google.com/')}`;
            const label = `${company} — ${r.subject}`;
            return [label, href];
          });
        };

        setIntros(mapRows(introRes, 'Intro'));
        setValueAdds(mapRows(vaRes, 'ValueAdd'));
        setCompanyUpdates(mapRows(cuRes, 'CompanyUpdate'));
      } catch {
        if (isMounted) {
          setIntros([]);
          setValueAdds([]);
          setCompanyUpdates([]);
        }
      }
    };

    void refresh();

    const channel = supabase
      .channel('activities-tiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid gap-5">
      {/* Top area: Kanban on the left, summary tiles on the right */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        {/* Kanban */}
        <section className="col-span-12 lg:col-span-9 grid grid-rows-[auto_1fr] gap-3 bg-white border border-[#E5E7EB] rounded-[12px] p-3 shadow-sm h-full">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="m-0 text-[16px] font-semibold">Tasks</h3>
              <div className="text-[#4B5563] text-[13px]">Auto-filled with most relevant asks</div>
            </div>
            <button
              type="button"
              className="text-[#0045F7] font-semibold text-[13px] hover:underline"
              onClick={handleOpenModal}
            >
              Add task
            </button>
          </div>
          <KanbanBoard ref={kanbanRef} />
        </section>

        {/* Right column tiles */}
        <aside className="col-span-12 lg:col-span-3 grid gap-4">
          {[
            { title: "Intros", links: intros },
            { title: "Value Adds", links: valueAdds },
            { title: "Company Updates", links: companyUpdates },
            { title: "Overdue Tasks", kpi: String(overdueCount) },
          ].map((tile, i) => (
            <section key={i} className={`grid gap-2 bg-white border border-[#E5E7EB] rounded-[12px] p-3 shadow-sm`}>
              <h3 className="m-0 text-[16px] font-semibold">{tile.title}</h3>
              {tile.kpi ? (
                (() => {
                  const isOverdueTile = tile.title === "Overdue Tasks";
                  const kpiColor = isOverdueTile
                    ? (overdueCount === 0
                        ? "text-[#16a34a]"
                        : overdueCount < 5
                          ? "text-[#d97706]"
                          : "text-[#EF4444]")
                    : "text-[#EF4444]";
                  return (
                    <div className={`text-[28px] font-black ${kpiColor}`}>{tile.kpi}</div>
                  );
                })()
              ) : (
                <>
                  <div className="fade-bottom">
                    <ul className="list-none m-0 p-0 grid content-start gap-2 h-[118px] overflow-y-auto overscroll-contain pr-1">
                      {tile.links?.map(([label, href]) => (
                        <li key={label} className="min-w-0">
                          <a
                            className="block h-11 px-2 border border-[#E5E7EB] rounded-[8px] text-[13px] hover:bg-[#f8fafc] flex items-center truncate"
                            href={href as string}
                          >
                            {label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a className="text-[#0045F7] font-semibold text-[13px]" href="/activity">View →</a>
                </>
              )}
            </section>
          ))}
        </aside>
      </div>

      {/* Companies grid below */}
      <div>
        <div className="uppercase text-[14px] text-[#4B5563] tracking-wider">Companies</div>
        <div className="grid grid-cols-12 gap-4">
          {companies.map((c) => {
            const kpi = companyKpis[c.id];
            const openAsks = kpi?.open_asks ?? 0;
            const lastTouch = formatLastTouch(kpi?.last_update_at ?? null);
            return (
              <article key={c.id} className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white border border-[#E5E7EB] rounded-[12px] p-3 grid gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#D6E4FF] to-[#0045F7]" aria-hidden="true" />
                  <div className="font-semibold">{c.name}</div>
                </div>
                <div className="flex flex-wrap gap-2 text-[12px] text-[#4B5563]">
                  <div><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#9ca3af] mr-1" />Open Asks: {openAsks}</div>
                </div>
                <a className="text-[#0045F7] font-semibold text-[13px]" href={`/company?name=${encodeURIComponent(c.name)}`}>Open company →</a>
              </article>
            );
          })}
        </div>
      </div>
      {/* Modal */}
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
              <h3 className="m-0 text-[16px] font-semibold">Add Task</h3>
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
                <div className="grid gap-1" ref={companyRef}>
                  <label className="text-[12px] text-[#4B5563]" htmlFor="task_company">Company</label>
                  {/* Hidden input solely to take advantage of native required validation */}
                  <input type="hidden" name="company_id" value={formCompanyId} required />
                  <button
                    id="task_company"
                    type="button"
                    className="h-10 px-3 rounded-[10px] border border-white/60 bg-white/70 backdrop-blur-md shadow-sm flex items-center justify-between gap-3 hover:bg-white/80"
                    aria-haspopup="listbox"
                    aria-expanded={isCompanyOpen}
                    onClick={() => {
                      setIsCompanyOpen((v) => !v);
                      setIsPriorityOpen(false);
                      setIsStatusOpen(false);
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
                  <label className="text-[12px] text-[#4B5563]" htmlFor="task_subject">Subject</label>
                  <div className="glass-input rounded-[10px]">
                    <input
                      id="task_subject"
                      type="text"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      required
                      placeholder="Task subject"
                      className="h-10 w-full px-3 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1" ref={priorityRef}>
                  <label className="text-[12px] text-[#4B5563]" htmlFor="task_priority">Priority</label>
                  <button
                    id="task_priority"
                    type="button"
                    className="h-10 px-3 rounded-[10px] border border-white/60 bg-white/70 backdrop-blur-md shadow-sm flex items-center justify-between gap-3 hover:bg-white/80"
                    aria-haspopup="listbox"
                    aria-expanded={isPriorityOpen}
                    onClick={() => {
                      setIsPriorityOpen((v) => !v);
                      setIsStatusOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2 text-[13px]">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${PRIORITY_OPTIONS.find(o => o.value === formPriority)?.dot ?? "bg-[#9ca3af]"}`} />
                      {PRIORITY_OPTIONS.find(o => o.value === formPriority)?.label}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isPriorityOpen ? (
                    <div className="relative">
                      <div className="absolute z-10 mt-1 w-full rounded-[10px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-lg overflow-hidden">
                        <ul role="listbox" className="max-h-56 overflow-auto">
                          {PRIORITY_OPTIONS.map((opt) => (
                            <li key={opt.value} role="option" aria-selected={formPriority === opt.value}>
                              <button
                                type="button"
                                className={`w-full h-10 px-3 text-left flex items-center justify-between gap-3 hover:bg-black/5 ${formPriority === opt.value ? "bg-black/5" : ""}`}
                                onClick={() => {
                                  setFormPriority(opt.value);
                                  setIsPriorityOpen(false);
                                }}
                              >
                                <span className="flex items-center gap-2 text-[13px]">
                                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                                  {opt.label}
                                </span>
                                {formPriority === opt.value ? (
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

                <div className="grid gap-1" ref={statusRef}>
                  <label className="text-[12px] text-[#4B5563]" htmlFor="task_status">Status</label>
                  <button
                    id="task_status"
                    type="button"
                    className="h-10 px-3 rounded-[10px] border border-white/60 bg-white/70 backdrop-blur-md shadow-sm flex items-center justify-between gap-3 hover:bg-white/80"
                    aria-haspopup="listbox"
                    aria-expanded={isStatusOpen}
                    onClick={() => {
                      setIsStatusOpen((v) => !v);
                      setIsPriorityOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2 text-[13px]">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_OPTIONS.find(o => o.value === formStatus)?.dot ?? "bg-[#9ca3af]"}`} />
                      {STATUS_OPTIONS.find(o => o.value === formStatus)?.label}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isStatusOpen ? (
                    <div className="relative">
                      <div className="absolute z-10 mt-1 w-full rounded-[10px] border border-white/60 bg-white/85 backdrop-blur-xl shadow-lg overflow-hidden">
                        <ul role="listbox" className="max-h-56 overflow-auto">
                          {STATUS_OPTIONS.map((opt) => (
                            <li key={opt.value} role="option" aria-selected={formStatus === opt.value}>
                              <button
                                type="button"
                                className={`w-full h-10 px-3 text-left flex items-center justify-between gap-3 hover:bg-black/5 ${formStatus === opt.value ? "bg-black/5" : ""}`}
                                onClick={() => {
                                  setFormStatus(opt.value);
                                  setIsStatusOpen(false);
                                }}
                              >
                                <span className="flex items-center gap-2 text-[13px]">
                                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                                  {opt.label}
                                </span>
                                {formStatus === opt.value ? (
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
              </div>

              <div className="grid gap-1">
                <label className="text-[12px] text-[#4B5563]" htmlFor="task_due">Due date</label>
                <div className="glass-input rounded-[10px]">
                  <input
                    id="task_due"
                    type="date"
                    min={dueDateMin}
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="h-10 w-full px-3 rounded-[10px] border-0 bg-transparent focus:outline-none focus:ring-0"
                  />
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
                >
                  Add task
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
