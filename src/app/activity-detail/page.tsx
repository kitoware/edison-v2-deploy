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
          const [, field, activityId] = id.split('__');
          if (activityId && (field === 'summary' || field === 'notes')) {
            const supabase = getClientSupabase();
            await supabase.from('activities').update({ [field]: value }).eq('id', activityId);
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
  const subject = params.get("subject") || "Activity";
  const type = params.get("type") || "Activity";
  const company = params.get("company") || "—";
  const when = params.get("when") || "—";
  const email = params.get("email") || "https://mail.google.com/";
  const summary = params.get("summary") || params.get("excerpt") || "";
  const activityId = params.get("id") || "";

  // Load summary and notes from Supabase for this activity
  const [dbSummary, setDbSummary] = useState<string>("");
  const [dbNotes, setDbNotes] = useState<string>("");

  useEffect(() => {
    if (!activityId) return;
    const supabase = getClientSupabase();
    (async () => {
      try {
        const { data, error } = await supabase
          .from("activities")
          .select("summary, notes")
          .eq("id", activityId)
          .single();
        if (error) return;
        setDbSummary((data?.summary as string | null) ?? "");
        setDbNotes((data?.notes as string | null) ?? "");
      } catch {
        // noop: leave defaults
      }
    })();
  }, [activityId]);

  return (
    <div className="grid gap-4">
      <section className="grid gap-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="inline-block px-2 py-0.5 rounded-full border text-[12px] text-[#6B7280]">{type}</span>
          <h1 className="text-[20px] font-bold m-0">{subject}</h1>
        </div>
        <div className="flex gap-3 items-center text-[#6B7280] text-[13px]">
          <div>
            {company && company !== "—" ? (
              <Link className="text-[#0045F7] font-medium" href={`/company?name=${encodeURIComponent(company)}`}>
                {company}
              </Link>
            ) : (
              <strong className="text-[#111827]">{company}</strong>
            )}
          </div>
          <div>•</div>
          <div><span className="text-[#6B7280]">Received:</span> <span>{when}</span></div>
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
              id={`activity-summary__summary__${activityId}`}
              initialValue={dbSummary || summary}
              placeholder="Write a concise summary…"
              ariaLabel="Activity summary"
            />
          </div>
          <div className="grid gap-3 bg-white border border-[#E5E7EB] rounded-[12px] p-3">
            <h3 className="m-0 text-[16px] font-semibold">Notes</h3>
            <EditableBlock
              id={`activity-notes__notes__${activityId}`}
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
              <div className="flex items-center justify-between gap-3 py-2"><span className="text-[#6B7280]">Type</span><span>{type}</span></div>
              <div className="flex items-center justify-between gap-3 py-2"><span className="text-[#6B7280]">Company</span>{company && company !== "—" ? (
                <Link className="text-[#0045F7] font-medium" href={`/company?name=${encodeURIComponent(company)}`}>{company}</Link>
              ) : (
                <span>{company}</span>
              )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2"><span className="text-[#6B7280]">Received</span><span>{when}</span></div>
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


