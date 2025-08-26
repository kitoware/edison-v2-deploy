"use client";

import React, { useCallback, useImperativeHandle, useMemo, useState, forwardRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  closestCenter,
  useDroppable,
  type CollisionDetection,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { getClientSupabase } from "@/lib/supabase/client";

export type Priority = "low" | "medium" | "high";
export type StatusKey = "unassigned" | "in_progress" | "done" | "blocked";

type Contributor = "Brandon" | "Adam";

type Card = {
  id: string;
  title: string;
  priority: Priority;
  status: StatusKey;
  position: number;
  updatedAt: number;
  dueDate?: number | null;
  contributors: Contributor[];
};

export type NewCardInput = {
  title: string;
  priority: Priority;
  status: StatusKey;
  dueDate?: number | null;
  companyId?: string | null;
};

export type KanbanBoardHandle = {
  addCard: (input: NewCardInput) => void;
};

const statusToTitle: Record<StatusKey, string> = {
  unassigned: "Unassigned",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
};

const orderedStatuses: StatusKey[] = [
  "unassigned",
  "in_progress",
  "done",
  "blocked",
];

function priorityBadgeClasses(priority: Priority): string {
  const base =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] glass-pill-active";
  const color =
    priority === "high"
      ? "text-[#dc2626]"
      : priority === "medium"
      ? "text-[#d97706]"
      : "text-[#16a34a]";
  return `${base} ${color}`;
}

function formatDueDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString();
}

async function loadCardsFromSupabase(): Promise<Card[]> {
  const supabase = getClientSupabase();
  const { data } = await supabase
    .from('asks')
    .select('id, title, priority, status, position, due_date, contributors')
    .order('status', { ascending: true })
    .order('position', { ascending: true });
  const rows = (data ?? []) as Array<{ id: string; title: string; priority: Priority; status: StatusKey; position: number; due_date: string | null; contributors?: Contributor[] }>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
    status: r.status,
    position: r.position,
    updatedAt: Date.now(),
    dueDate: r.due_date ? new Date(r.due_date).getTime() : null,
    contributors: Array.isArray(r.contributors) ? r.contributors : [],
  }));
}

// Sortable card component used by dnd-kit
function SortableCard(props: {
  card: Card;
  status: StatusKey;
  onPointerDown?: (id: string, status: StatusKey) => void;
  dragActive?: boolean;
  onDelete?: (id: string) => void;
  onToggleContributor?: (id: string, who: Contributor) => void;
}): React.ReactElement {
  const { card, status, onPointerDown, dragActive, onDelete, onToggleContributor } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const router = useRouter();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
    cursor: "grab",
  };

  const handleCardClick = (): void => {
    if (isDragging || dragActive) return;
    router.push(`/activity-detail?ask_id=${encodeURIComponent(card.id)}`);
  };

  return (
    <article
      ref={setNodeRef}
      data-card-id={card.id}
      style={style}
      className={
        "bg-white border border-[#E5E7EB] rounded-[10px] p-3 grid gap-2 min-h-[140px] shadow-sm select-none"
      }
      onClick={handleCardClick}
      onPointerDown={() => onPointerDown?.(card.id, status)}
      {...attributes}
      {...listeners}
    >
      <div className="font-bold text-[14px] leading-tight line-clamp-3">{card.title}</div>
      <div className="mt-auto text-[12px] text-[#4B5563] flex flex-col gap-2">
        <div className="flex items-center gap-1">
          {(["Brandon", "Adam"] as Contributor[]).map((person) => {
            const isActive = card.contributors.includes(person);
            return (
              <button
                key={person}
                type="button"
                className={`h-6 px-2 rounded-full border text-[11px] transition-colors ${
                  isActive
                    ? "border-[#3B82F6] text-[#0045F7] bg-[#EFF6FF]"
                    : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6]"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleContributor?.(card.id, person);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {person}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-black">
            {card.dueDate ? formatDueDate(card.dueDate) : null}
          </span>
          <span className={priorityBadgeClasses(card.priority)}>
            {card.priority[0].toUpperCase() + card.priority.slice(1)}
          </span>
          <button
            type="button"
            aria-label="Delete task"
            className="h-6 w-6 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#EF4444] flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(card.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 6H16M8 6V4C8 3.44772 8.44772 3 9 3H11C11.5523 3 12 3.44772 12 4V6M6 6V16C6 16.5523 6.44772 17 7 17H13C13.5523 17 14 16.5523 14 16V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

const KanbanBoard = forwardRef<KanbanBoardHandle>(function KanbanBoard(_props, ref): React.ReactElement {
  const [cards, setCards] = useState<Card[]>([]);
  // Load from Supabase and subscribe to changes
  useEffect(() => {
    let isMounted = true;
    loadCardsFromSupabase().then((c) => { if (isMounted) setCards(c); });
    const supabase = getClientSupabase();
    const channel = supabase
      .channel('asks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asks' }, () => {
        loadCardsFromSupabase().then((c) => setCards(c));
      })
      .subscribe();
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<
    | {
        status: StatusKey;
        index: number; // insertion index within the status list
      }
    | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const handleToggleContributor = useCallback(async (id: string, who: Contributor) => {
    // Optimistic update
    setCards((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const already = c.contributors.includes(who);
      const nextContributors = already
        ? c.contributors.filter((n) => n !== who)
        : [...c.contributors, who];
      return { ...c, contributors: nextContributors };
    }));

    try {
      const supabase = getClientSupabase();
      const current = cards.find((c) => c.id === id);
      const currentList: Contributor[] = current?.contributors ?? [];
      const nextList = currentList.includes(who)
        ? currentList.filter((n) => n !== who)
        : [...currentList, who];
      const { error } = await supabase
        .from('asks')
        .update({ contributors: nextList })
        .eq('id', id);
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to update contributors:', error);
        loadCardsFromSupabase().then((c) => setCards(c));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Unexpected error updating contributors:', err);
      loadCardsFromSupabase().then((c) => setCards(c));
    }
  }, [cards]);

  const handleDeleteCard = useCallback(async (id: string) => {
    // Optimistic UI: remove immediately
    setCards((prev) => prev.filter((c) => c.id !== id));
    try {
      const supabase = getClientSupabase();
      // Delete the Ask
      const { error } = await supabase.from('asks').delete().eq('id', id);
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete task:', error);
        // Resync if deletion fails
        loadCardsFromSupabase().then((c) => setCards(c));
      }
      // Also remove any linked Activity rows of type Ask
      try {
        await supabase.from('activities').delete().eq('ask_id', id).eq('type', 'Ask');
      } catch (actErr) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete linked activity for ask:', actErr);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Unexpected error deleting task:', err);
      loadCardsFromSupabase().then((c) => setCards(c));
    }
  }, []);

  useImperativeHandle(ref, () => ({
    addCard: async (input: NewCardInput) => {
      const supabase = getClientSupabase();
      const safeTitle = (input.title ?? '').trim() || 'Untitled';

      try {
        // 0) Show a temporary card immediately so UI updates even if insert can't return rows due to RLS
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempCard: Card = {
          id: tempId,
          title: safeTitle,
          priority: input.priority,
          status: input.status,
          position: 1, // local placeholder; real position computed server-side
          updatedAt: Date.now(),
          dueDate: input.dueDate ?? null,
          contributors: [],
        };
        setCards((prev) => ([...prev, tempCard]));

        // 1) Compute next available position within the chosen status to avoid
        // violating the (status, position) unique constraint.
        const { data: rows, error: selectError } = await supabase
          .from('asks')
          .select('position')
          .eq('status', input.status)
          .order('position', { ascending: false })
          .limit(1);

        if (selectError) {
          // Non-fatal; default to appending to end
          // eslint-disable-next-line no-console
          console.error('Failed to determine next position for new task:', selectError);
        }

        const lastPosition = Array.isArray(rows) && rows.length > 0 ? Number(rows[0]?.position ?? 0) : 0;
        const nextPosition = Number.isFinite(lastPosition) ? lastPosition + 1 : 1;

        // 2) Insert ask
        const { data: inserted, error: insertError } = await supabase
          .from('asks')
          .insert({
            title: safeTitle,
            priority: input.priority,
            status: input.status,
            due_date: input.dueDate ? new Date(input.dueDate).toISOString().slice(0, 10) : null,
            position: nextPosition,
            company_id: input.companyId ?? null,
          })
          .select('id, title, priority, status, position, due_date')
          .single();

        if (insertError) {
          // Roll back temp card on failure
          setCards((prev) => prev.filter((c) => c.id !== tempId));
          // eslint-disable-next-line no-console
          console.error('Failed to add new task:', insertError);
          return;
        }

        if (inserted) {
          // 3) Upsert matching activity row if missing
          try {
            const { data: existingActs, error: existingCheckError } = await supabase
              .from('activities')
              .select('id')
              .eq('ask_id', inserted.id)
              .limit(1);

            const alreadyExists = !existingCheckError && Array.isArray(existingActs) && existingActs.length > 0;
            if (!alreadyExists) {
              const receivedAtIso = new Date().toISOString();
              await supabase
                .from('activities')
                .insert({
                  type: 'Ask',
                  subject: inserted.title,
                  company_id: input.companyId ?? null,
                  ask_id: inserted.id,
                  received_at: receivedAtIso,
                });
            }
          } catch (activityErr) {
            // eslint-disable-next-line no-console
            console.error('Failed to upsert activity for new task:', activityErr);
          }

        	// 4) Replace temp card with the inserted card (or refresh as fallback)
          type InsertedRow = {
            id: string | number;
            title: string;
            priority: Priority | string;
            status: StatusKey | string;
            position?: number | string | null;
            due_date?: string | null;
            contributors?: Contributor[] | unknown;
          };
          const safeInserted = inserted as unknown as InsertedRow;
          const contributorsFromInsert: Contributor[] = Array.isArray(safeInserted.contributors)
            ? (safeInserted.contributors as Contributor[])
            : [];

          setCards((prev) => prev.map((c) => (
            c.id === tempId
              ? {
                  id: String(safeInserted.id),
                  title: safeInserted.title,
                  priority: (safeInserted.priority as Priority) ?? input.priority,
                  status: (safeInserted.status as StatusKey) ?? input.status,
                  position: Number(safeInserted.position ?? nextPosition),
                  updatedAt: Date.now(),
                  dueDate: safeInserted.due_date ? new Date(safeInserted.due_date).getTime() : null,
                  contributors: contributorsFromInsert,
                }
              : c
          )));
        } else {
          // No returned row (likely due to RLS on SELECT). Refresh from DB.
          loadCardsFromSupabase().then((c) => setCards(c));
        }
      } catch (err) {
        // Roll back temp card if anything unexpected happens
        // eslint-disable-next-line no-console
        setCards((prev) => prev.filter((c) => !String(c.id).startsWith('temp-')));
        // eslint-disable-next-line no-console
        console.error('Unexpected error adding new task:', err);
      }
    },
  }), []);

  const collisionDetectionStrategy = useCallback<CollisionDetection>(
    (args) => {
      // Prefer direct pointer intersections first
      const intersections = pointerWithin(args);
      const primary = intersections.length > 0 ? intersections : rectIntersection(args);

      // Prefer card targets over column containers when both are hit
      const hasCardHit = primary.some((c) => !(orderedStatuses as string[]).includes(String(c.id)));
      let filtered = primary;
      if (hasCardHit) {
        filtered = primary.filter((c) => !(orderedStatuses as string[]).includes(String(c.id)));
      }

      // Exclude the active item's own droppable target
      filtered = filtered.filter((c) => String(c.id) !== activeId);

      if (filtered.length > 0) return filtered;

      // Fallback to center-based when nothing else matches
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (container) => String(container.id) !== activeId
        ),
      });
    },
    [activeId]
  );

  const cardsByStatus = useMemo(() => {
    const map: Record<StatusKey, Card[]> = {
      unassigned: [],
      in_progress: [],
      done: [],
      blocked: [],
    };
    for (const c of cards) {
      map[c.status].push(c);
    }
    for (const k of orderedStatuses) {
      map[k].sort((a, b) => a.position - b.position || a.updatedAt - b.updatedAt);
    }
    return map;
  }, [cards]);

  // When using dnd-kit, we do not remove the active card from the list.
  // The active card is rendered with opacity 0.2 and a DragOverlay shows the moving card.
  const visibleCardsByStatus = cardsByStatus;

  const findCardById = useCallback(
    (id: string) => cards.find((c) => c.id === id),
    [cards]
  );

  const handleDragStartDnd = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveId(id);
    },
    []
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const over = event.over;
      const active = event.active;
      if (!over) {
        setDropIndicator(null);
        return;
      }

      const overId = String(over.id);
      const activeIdLocal = String(active.id);

      // Determine target status
      const isOverContainer = (orderedStatuses as string[]).includes(overId);
      const overCard = isOverContainer ? null : findCardById(overId);
      const targetStatus: StatusKey = isOverContainer
        ? (overId as StatusKey)
        : (overCard?.status ?? (cards.find((c) => c.id === activeIdLocal)?.status as StatusKey));

      const items = cards
        .filter((c) => c.status === targetStatus)
        .sort((a, b) => a.position - b.position || a.updatedAt - b.updatedAt);

      // Compute target index
      let index = items.length;
      // Helper to safely compute the vertical center from various rect shapes dnd-kit may provide
      const getVerticalCenter = (rectLike: unknown): number | null => {
        const candidate = rectLike as
          | { top: number; height: number }
          | { translated: { top: number; height: number } | null; initial: { top: number; height: number } | null }
          | null
          | undefined;
        if (!candidate) return null;
        if (Object.prototype.hasOwnProperty.call(candidate, "top")) {
          const r = candidate as { top: number; height: number };
          return r.top + r.height / 2;
        }
        const container = candidate as { translated: { top: number; height: number } | null; initial: { top: number; height: number } | null };
        if (container.translated) return container.translated.top + container.translated.height / 2;
        if (container.initial) return container.initial.top + container.initial.height / 2;
        return null;
      };
      if (!isOverContainer) {
        const overIndex = items.findIndex((c) => c.id === overId);
        if (overIndex >= 0) {
          let shouldPlaceAfter = false;
          const activeCenterY = getVerticalCenter(active.rect.current as unknown);
          const overMiddleY = getVerticalCenter(over.rect as unknown);
          if (activeCenterY !== null && overMiddleY !== null) shouldPlaceAfter = activeCenterY > overMiddleY;
          index = overIndex + (shouldPlaceAfter ? 1 : 0);
        }
      } else {
        // We're over the column container itself (e.g., between cards). Infer index by
        // comparing active center with each card's midpoint in DOM order.
        const activeCenterY = getVerticalCenter(active.rect.current as unknown);
        if (activeCenterY !== null) {
          let computed = items.length;
          for (let i = 0; i < items.length; i++) {
            const el = document.querySelector<HTMLElement>(`[data-card-id="${items[i].id}"]`);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (activeCenterY < mid) {
              computed = i;
              break;
            }
          }
          index = computed;
        }
      }

      // Clamp index into valid range
      if (index < 0) index = 0;
      if (index > items.length) index = items.length;

      setDropIndicator({ status: targetStatus, index });
    },
    [cards, findCardById]
  );

  const handleDragEndDnd = useCallback(
    (event: DragEndEvent) => {
      const activeIdLocal = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      if (!overId) {
        setActiveId(null);
        setDropIndicator(null);
        return;
      }

      setCards((prev) => {
        const byStatus: Record<StatusKey, Card[]> = {
          unassigned: [],
          in_progress: [],
          done: [],
          blocked: [],
        };
        for (const c of prev) byStatus[c.status].push(c);
        for (const s of orderedStatuses) {
          byStatus[s].sort((a, b) => a.position - b.position || a.updatedAt - b.updatedAt);
        }

        const moving = prev.find((c) => c.id === activeIdLocal);
        if (!moving) return prev;

        // Determine target container and index
        const isOverContainer = (orderedStatuses as string[]).includes(overId);
        const targetStatus: StatusKey = isOverContainer
          ? (overId as StatusKey)
          : (prev.find((c) => c.id === overId)?.status ?? moving.status);

        // Fast path: reordering within the same column over a specific card
        if (!isOverContainer && targetStatus === moving.status && overId !== activeIdLocal) {
          const fullList = byStatus[moving.status].slice();
          const fromIndex = fullList.findIndex((c) => c.id === moving.id);
          const toIndex = fullList.findIndex((c) => c.id === overId);
          if (fromIndex === -1 || toIndex === -1) return prev;
          const [removed] = fullList.splice(fromIndex, 1);
          fullList.splice(toIndex, 0, { ...removed, updatedAt: Date.now() });

          byStatus[moving.status] = fullList;

          // Recompute positions and return
          const nextFast: Card[] = [];
          for (const s of orderedStatuses) {
            const list = byStatus[s];
            for (let i = 0; i < list.length; i++) {
              const c = list[i];
              nextFast.push({ ...c, status: s, position: i + 1 });
            }
          }
          return nextFast;
        }

        const sourceList = byStatus[moving.status].slice();
        const sourceIndex = sourceList.findIndex((c) => c.id === moving.id);
        if (sourceIndex === -1) return prev;
        sourceList.splice(sourceIndex, 1);
        byStatus[moving.status] = sourceList;

        const rawTargetList =
          moving.status === targetStatus ? sourceList : byStatus[targetStatus];
        const targetList = (rawTargetList ?? []).slice();

        // If reordering within the same list and we dropped on a specific card,
        // insert before that card's index (simplest reliable behavior).
        if (
          moving.status === targetStatus &&
          overId &&
          !isOverContainer &&
          overId !== activeIdLocal
        ) {
          const overIndex = targetList.findIndex((c) => c.id === overId);
          const insertAt = overIndex >= 0 ? overIndex : targetList.length;
          targetList.splice(insertAt, 0, { ...moving, updatedAt: Date.now() });
        } else {
          // Choose insertion index. Prefer live dropIndicator computed in onDragOver
          let targetIndex: number;
          let usedIndicator = false;
          if (dropIndicator && dropIndicator.status === targetStatus) {
            targetIndex = dropIndicator.index;
            usedIndicator = true;
          } else if (isOverContainer) {
            targetIndex = targetList.length; // drop to end of the column
          } else {
            const overIndex = targetList.findIndex((c) => c.id === overId);
            targetIndex = overIndex >= 0 ? overIndex : targetList.length;
          }

          // If reordering within same list using indicator (computed on full list),
          // account for earlier removal shifting indices before clamping.
          if (moving.status === targetStatus && usedIndicator) {
            const oldIndex = sourceIndex;
            if (targetIndex > oldIndex) targetIndex = targetIndex - 1;
          }

          if (!Number.isFinite(targetIndex)) targetIndex = targetList.length;
          if (targetIndex < 0) targetIndex = 0;
          if (targetIndex > targetList.length) targetIndex = targetList.length;

          // Insert into same list or move across lists
          if (moving.status === targetStatus) {
            targetList.splice(targetIndex, 0, {
              ...moving,
              updatedAt: Date.now(),
            });
          } else {
            targetList.splice(targetIndex, 0, {
              ...moving,
              status: targetStatus,
              updatedAt: Date.now(),
            });
          }
        }

        byStatus[targetStatus] = targetList;

        // Recompute integer positions for stability and snap
        const next: Card[] = [];
        for (const s of orderedStatuses) {
          const list = byStatus[s];
          for (let i = 0; i < list.length; i++) {
            const c = list[i];
            next.push({ ...c, status: s, position: i + 1 });
          }
        }

        // Persist changes minimalistically via API: send new positions for all items whose (status, position) changed
        const moves = [] as Array<{ id: string; status: StatusKey; position: number }>;
        for (let i = 0; i < next.length; i++) {
          const updated = next[i];
          const original = prev.find((p) => p.id === updated.id);
          if (!original || original.status !== updated.status || original.position !== updated.position) {
            moves.push({ id: updated.id, status: updated.status, position: updated.position });
          }
        }
        if (moves.length > 0) {
          fetch('/api/asks/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moves }),
          }).catch(() => {});
        }
        return next;
      });

      setActiveId(null);
      setDropIndicator(null);
    },
    [dropIndicator]
  );

  function DroppableColumn(props: {
    id: StatusKey;
    children: React.ReactNode;
  }): React.ReactElement {
    const { id, children } = props;
    const { setNodeRef } = useDroppable({ id });
    return (
      <div
        ref={setNodeRef}
        className={"flex flex-col gap-2 min-h-[140px]"}
      >
        {children}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStartDnd}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEndDnd}
      onDragCancel={() => {
        setActiveId(null);
        setDropIndicator(null);
      }}
    >
      <div className="grid grid-cols-4 gap-3 min-h-0 h-full">
        {orderedStatuses.map((status) => {
          const title = statusToTitle[status];
          const items = visibleCardsByStatus[status];

          return (
            <div
              key={status}
              className="bg-[#F3F4F6] border border-dashed border-[#E5E7EB] rounded-[10px] p-3 flex flex-col gap-2 overflow-auto h-full min-h-0"
            >
              <h4 className="sticky top-0 bg-[#F3F4F6] m-0 text-[12px] text-[#4B5563] uppercase tracking-wider pt-0.5">
                {title}
              </h4>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn id={status}>
                  {dropIndicator && dropIndicator.status === status && dropIndicator.index === 0 ? (
                    <div className="h-0.5 bg-[#3B82F6] rounded" />
                  ) : null}

                  {items.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <SortableCard
                        card={item}
                        status={status}
                        dragActive={Boolean(activeId)}
                        onDelete={handleDeleteCard}
                        onToggleContributor={handleToggleContributor}
                      />
                      {dropIndicator && dropIndicator.status === status && dropIndicator.index === idx + 1 ? (
                        <div className="h-0.5 bg-[#3B82F6] rounded" />
                      ) : null}
                    </React.Fragment>
                  ))}

                  {items.length === 0 ? <div className="h-[1px]" /> : null}
                </DroppableColumn>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay style={{ cursor: "grabbing" }}>
        {activeId ? (
          (() => {
            const card = findCardById(activeId);
            if (!card) return null;
            return (
              <article
                className={
                  "bg-white border border-[#E5E7EB] rounded-[10px] p-3 grid gap-2 min-h-[140px] shadow-lg select-none"
                }
              >
                <div className="font-bold text-[14px] leading-tight line-clamp-3">{card.title}</div>
                <div className="mt-auto text-[12px] text-[#4B5563] flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    {(["Brandon", "Adam"] as Contributor[]).map((person) => (
                      <span key={person} className="h-6 px-2 rounded-full border text-[11px] border-[#E5E7EB] text-[#4B5563]">
                        {person}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-black">
                      {card.dueDate ? formatDueDate(card.dueDate) : null}
                    </span>
                    <span className={priorityBadgeClasses(card.priority)}>
                      {card.priority[0].toUpperCase() + card.priority.slice(1)}
                    </span>
                  </div>
                </div>
              </article>
            );
          })()
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

export default KanbanBoard;

