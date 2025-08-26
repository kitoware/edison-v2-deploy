"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { getClientSupabase } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type EditableBlockProps = {
  id: string;
  initialValue?: string;
  placeholder: string;
  ariaLabel: string;
};

function EditableBlock({ id, initialValue = "", placeholder, ariaLabel }: EditableBlockProps) {
  const [value, setValue] = useState<string>(initialValue);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Keep the DOM in sync when initialValue changes (e.g. from URL params)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.textContent !== value) {
      editorRef.current.textContent = value;
    }
  }, [value]);

  return (
    <div className="relative glass-input rounded-[10px]">
      {/* Placeholder overlay (shown when empty and not focused) */}
      {(!value || value.trim().length === 0) && !isFocused && (
        <div className="pointer-events-none absolute inset-x-3 top-2.5 text-[14px] leading-6 text-[#9CA3AF] select-none">
          {placeholder}
        </div>
      )}
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        className="editor min-h-[96px] whitespace-pre-wrap break-words rounded-[10px] border-0 bg-transparent px-3 py-2 text-[14px] leading-6 outline-none"
        onFocus={() => setIsFocused(true)}
        onBlur={async () => {
          setIsFocused(false);
          // Optional: if id maps to fields, persist to activities table
          // We use data-attrs on the element's id to decide which column to update
          const [, field, entityIdRaw] = id.split('__');
          if (!entityIdRaw || (field !== 'summary' && field !== 'notes')) return;
          const supabase = getClientSupabase();
          if (entityIdRaw.startsWith('ask-')) {
            const askId = entityIdRaw.slice(4);
            await supabase.from('asks').update({ [field === 'summary' ? 'description' : 'notes']: value }).eq('id', askId);
          } else {
            await supabase.from('activities').update({ [field]: value }).eq('id', entityIdRaw);
          }
        }}
        onInput={(e) => {
          const target = e.currentTarget as HTMLDivElement;
          setValue(target.textContent || "");
        }}
      />
    </div>
  );
}

function ActivityDetailInner() {
  const params = useSearchParams();
  const subjectFromUrl = params.get("subject") || "Activity";
  const typeFromUrl = params.get("type") || "Activity";
  const companyFromUrl = params.get("company") || "—";
  const whenFromUrl = params.get("when") || "—";
  const email = params.get("email") || "https://mail.google.com/";
  const summaryFromUrl = params.get("summary") || params.get("excerpt") || "";
  const activityId = params.get("id") || "";
  const askId = params.get("ask_id") || "";

  // Load details: prefer Ask when ask_id provided, otherwise Activity
  const [dbSummary, setDbSummary] = useState<string>("");
  const [dbNotes, setDbNotes] = useState<string>("");
  const [headerType, setHeaderType] = useState<string>(typeFromUrl);
  const [headerSubject, setHeaderSubject] = useState<string>(subjectFromUrl);
  const [headerCompany, setHeaderCompany] = useState<string>(companyFromUrl);
  const [headerWhen, setHeaderWhen] = useState<string>(whenFromUrl);

  useEffect(() => {
    const supabase = getClientSupabase();
    (async () => {
      try {
        if (askId) {
          const { data, error } = await supabase
            .from('asks')
            .select('title, description, notes, companies(name)')
            .eq('id', askId)
            .single();
          if (!error && data) {
            setHeaderType('Ask');
            setHeaderSubject(String(data.title ?? subjectFromUrl));
            const companies = (data as unknown as { companies?: { name: string } | { name: string }[] | null }).companies;
            const comp = Array.isArray(companies) ? companies[0]?.name : companies?.name;
            setHeaderCompany(String(comp ?? companyFromUrl));
            setHeaderWhen('—');
            setDbSummary(String(data.description ?? ''));
            setDbNotes(String(data.notes ?? ''));
            return;
          }
        }
        if (activityId) {
          const { data, error } = await supabase
            .from('activities')
            .select('type, subject, summary, notes, received_at, companies(name)')
            .eq('id', activityId)
            .single();
          if (!error && data) {
            setHeaderType(String(data.type ?? typeFromUrl));
            setHeaderSubject(String(data.subject ?? subjectFromUrl));
            const companies = (data as unknown as { companies?: { name: string } | { name: string }[] | null }).companies;
            const comp = Array.isArray(companies) ? companies[0]?.name : companies?.name;
            setHeaderCompany(String(comp ?? companyFromUrl));
            setHeaderWhen(data.received_at ? new Date(String(data.received_at)).toLocaleString() : whenFromUrl);
            setDbSummary(String(data.summary ?? ''));
            setDbNotes(String(data.notes ?? ''));
          }
        }
      } catch {
        // noop
      }
    })();
  }, [askId, activityId, subjectFromUrl, companyFromUrl, whenFromUrl, typeFromUrl]);

  return (
    <div className="grid gap-4">
      <section className="grid gap-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="inline-block px-2 py-0.5 rounded-full border text-[12px] text-[#6B7280]">{headerType}</span>
          <h1 className="text-[20px] font-bold m-0">{headerSubject}</h1>
        </div>
        <div className="flex gap-3 items-center text-[#6B7280] text-[13px]">
          <div>
            {headerCompany && headerCompany !== "—" ? (
              <Link className="text-[#0045F7] font-medium" href={`/company?name=${encodeURIComponent(headerCompany)}`}>
                {headerCompany}
              </Link>
            ) : (
              <strong className="text-[#111827]">{headerCompany}</strong>
            )}
          </div>
          <div>•</div>
          <div><span className="text-[#6B7280]">Received:</span> <span>{headerWhen}</span></div>
          <div className="ml-auto">
            <a className="inline-flex items-center gap-2 h-9 px-3 rounded-full border bg-[#F3F4F6] text-[#111827] font-semibold" href={email} target="_blank" rel="noopener">Open email thread</a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
        <div className="grid gap-4">
          <div className="grid gap-3 bg-white border border-[#E5E7EB] rounded-[12px] p-3">
            <h3 className="m-0 text-[16px] font-semibold">Summary</h3>
            <EditableBlock
              id={`activity-summary__summary__${askId ? `ask-${askId}` : activityId}`}
              initialValue={dbSummary || summaryFromUrl}
              placeholder="Write a concise summary…"
              ariaLabel="Activity summary"
            />
          </div>
          <div className="grid gap-3 bg-white border border-[#E5E7EB] rounded-[12px] p-3">
            <h3 className="m-0 text-[16px] font-semibold">Notes</h3>
            <EditableBlock
              id={`activity-notes__notes__${askId ? `ask-${askId}` : activityId}`}
              initialValue={dbNotes}
              placeholder="Add notes, bullets, or next steps…"
              ariaLabel="Activity notes"
            />
          </div>
        </div>
        <div className="grid gap-4 self-start content-start auto-rows-min">
          <div className="grid gap-2 bg-white border border-[#E5E7EB] rounded-[12px] p-3">
            <h3 className="m-0 text-[16px] font-semibold">Key info</h3>
            <div className="grid text-[14px] divide-y divide-[#E5E7EB]">
              <div className="flex items-center justify-between gap-3 py-2"><span className="text-[#6B7280]">Type</span><span>{headerType}</span></div>
              <div className="flex items-center justify-between gap-3 py-2"><span className="text-[#6B7280]">Company</span>{headerCompany && headerCompany !== "—" ? (
                <Link className="text-[#0045F7] font-medium" href={`/company?name=${encodeURIComponent(headerCompany)}`}>{headerCompany}</Link>
              ) : (
                <span>{headerCompany}</span>
              )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2"><span className="text-[#6B7280]">Received</span><span>{headerWhen}</span></div>
              <div className="flex items-center justify-between gap-3 py-2"><span className="text-[#6B7280]">Email link</span><a className="text-[#0045F7] font-medium" href={email} target="_blank" rel="noopener">Open</a></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ActivityDetailPage() {
  return (
    <Suspense>
      <ActivityDetailInner />
    </Suspense>
  );
}


