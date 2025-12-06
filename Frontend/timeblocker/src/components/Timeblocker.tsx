"use client";

import React, { useMemo, useState, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { supabase } from '@/lib/supabase';

type Block = {
  id: string;
  day: number; // 0..6
  startTime: number; // hour with decimal (e.g., 9.5 for 9:30 AM)
  endTime: number; // hour with decimal
  title?: string;
  description?: string;
  color?: string;
};

function hourRange(start = 7, end = 20) {
  const arr: number[] = [];
  for (let h = start; h <= end; h++) arr.push(h);
  return arr;
}

function formatHour(h: number) {
  const h24 = h % 24;
  if (h24 === 0) return '12 AM';
  if (h24 === 12) return '12 PM';
  if (h24 > 12) return `${h24 - 12} PM`;
  return `${h24} AM`;
}

function BlockEditModal({ block, daysInfo, onSave, onDelete, onClose }: { block: Block; daysInfo: Array<{ short: string; num: number; date: Date }>; onSave: (block: Block) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState(block.title || '');
  const [description, setDescription] = useState(block.description || '');
  const [selectedDay, setSelectedDay] = useState(block.day);
  const [startTime, setStartTime] = useState<number | null>(block.startTime);
  const [endTime, setEndTime] = useState<number | null>(block.endTime);
  const [color, setColor] = useState<string>(block.color || '#ef4444');
  const modalRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{x:number;y:number;origX:number|null;origY:number|null;origW:number;origH:number}|null>(null);
  const [pos, setPos] = useState<{x:number|null;y:number|null}>({ x: null, y: null });
  const suppressOverlayClickRef = useRef(false);
  const generateTimeOptions = () => {
    const options: { value: number; label: string }[] = [];
    for (let h = 4; h < 28; h++) {
      options.push({ value: h, label: formatHour(h) });
      options.push({ value: h + 0.5, label: `${formatHour(h).replace(' AM', '').replace(' PM', '')}:30 ${h % 24 >= 12 ? 'PM' : 'AM'}` });
    }
    return options;
  };

  

  const timeOptions = generateTimeOptions();

  const getEndTimeOptions = () => {
    if (startTime === null) return [];
    return timeOptions.filter((opt) => opt.value >= startTime + 0.5);
  };

  const handleSave = () => {
    if (startTime !== null && endTime !== null && endTime >= startTime + 0.5) {
      onSave({
        ...block,
        title,
        description,
        day: selectedDay,
        startTime,
        endTime,
        color,
      });
    }
  };

  const isNewBlock = !block.title && !block.description;

  // drag handlers for modal header
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = modalRef.current?.getBoundingClientRect();
    const origX = rect ? rect.left : (pos.x ?? window.innerWidth / 2 - 200);
    const origY = rect ? rect.top : (pos.y ?? window.innerHeight / 2 - 100);
    const origW = rect ? rect.width : 320;
    const origH = rect ? rect.height : 240;
    dragStartRef.current = { x: e.clientX, y: e.clientY, origX, origY, origW, origH };
    // prevent the overlay click that follows mouseup after a drag
    suppressOverlayClickRef.current = true;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (ev: MouseEvent) => {
    if (!dragStartRef.current) return;
    const s = dragStartRef.current;
    const dx = ev.clientX - s.x;
    const dy = ev.clientY - s.y;
    let newX = (s.origX ?? 0) + dx;
    let newY = (s.origY ?? 0) + dy;
    // clamp so the modal stays fully visible
    const maxX = Math.max(0, window.innerWidth - s.origW);
    const maxY = Math.max(0, window.innerHeight - s.origH);
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    setPos({ x: newX, y: newY });
  };

  const onMouseUp = () => {
    dragStartRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    // keep suppress flag briefly so the overlay doesn't receive the click that follows drag
    setTimeout(() => { suppressOverlayClickRef.current = false; }, 150);
  };

  return (
    <div className="fixed inset-0 bg-transparent flex items-start justify-center z-[100]" onClick={(e) => { if (suppressOverlayClickRef.current) { e.stopPropagation(); return; } onClose(); }}>
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-6 w-96 max-w-full shadow-lg select-none"
        onClick={(e) => e.stopPropagation()}
        style={pos.x === null && pos.y === null ? { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateY(40px)' } : { position: 'fixed', left: typeof pos.x === 'number' ? `${pos.x}px` : '50%', top: typeof pos.y === 'number' ? `${pos.y}px` : '50%', transform: 'none' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold mb-0 text-gray-800">{isNewBlock ? 'New Block' : 'Edit Block'}</h2>
          <button
            aria-label="Drag handle"
            onMouseDown={handleMouseDown}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded select-none cursor-move"
            style={{ border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="text-gray-600">
              <path d="M20.69 12.29C20.65 12.38 20.6 12.46 20.53 12.53L18.03 15.03C17.88 15.18 17.69 15.25 17.5 15.25C17.31 15.25 17.12 15.18 16.97 15.03C16.68 14.74 16.68 14.26 16.97 13.97L18.19 12.75H12.75V18.19L13.97 16.97C14.26 16.68 14.74 16.68 15.03 16.97C15.32 17.26 15.32 17.74 15.03 18.03L12.53 20.53C12.46 20.6 12.38 20.65 12.29 20.69C12.2 20.73 12.1 20.75 12 20.75C11.9 20.75 11.8 20.73 11.71 20.69C11.62 20.65 11.54 20.6 11.47 20.53L8.97 18.03C8.68 17.74 8.68 17.26 8.97 16.97C9.26 16.68 9.74 16.68 10.03 16.97L11.25 18.19V12.75H5.81L7.03 13.97C7.32 14.26 7.32 14.74 7.03 15.03C6.88 15.18 6.69 15.25 6.5 15.25C6.31 15.25 6.12 15.18 5.97 15.03L3.47 12.53C3.4 12.46 3.35 12.38 3.31 12.29C3.23 12.11 3.23 11.9 3.31 11.72C3.35 11.63 3.4 11.55 3.47 11.48L5.97 8.98C6.26 8.69 6.74 8.69 7.03 8.98C7.32 9.27 7.32 9.75 7.03 10.04L5.81 11.26H11.25V5.81L10.03 7.03C9.74 7.32 9.26 7.32 8.97 7.03C8.68 6.74 8.68 6.26 8.97 5.97L11.47 3.47C11.54 3.4 11.62 3.35 11.71 3.31C11.89 3.23 12.1 3.23 12.28 3.31C12.37 3.35 12.45 3.4 12.52 3.47L15.02 5.97C15.31 6.26 15.31 6.74 15.02 7.03C14.87 7.18 14.68 7.25 14.49 7.25C14.3 7.25 14.11 7.18 13.96 7.03L12.74 5.81V11.25H18.18L16.96 10.03C16.67 9.74 16.67 9.26 16.96 8.97C17.25 8.68 17.73 8.68 18.02 8.97L20.52 11.47C20.59 11.54 20.64 11.62 20.68 11.71C20.76 11.89 20.76 12.1 20.68 12.28L20.69 12.29Z" fill="currentColor" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
              placeholder="Enter title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
            >
              {daysInfo.map((d, idx) => (
                <option key={idx} value={idx}>
                  {d.short} {d.num}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-8 p-0 border-0" />
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-gray-900 w-full select-text" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <select
              value={startTime ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setStartTime(val);
                if (val !== null && (endTime === null || endTime < val + 0.5)) {
                  setEndTime(val + 0.5);
                }
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
            >
              <option value="">Select start time</option>
              {timeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <select
              value={endTime ?? ''}
              onChange={(e) => setEndTime(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
              disabled={startTime === null}
            >
              <option value="">Select end time</option>
              {getEndTimeOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <div>
            {!isNewBlock && (
              <button
                onClick={() => onDelete(block.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title || startTime === null || endTime === null || endTime < startTime + 0.5}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraggableBlock({ block, onEdit, cellWidth, cellHeight, startHour, maxHour, blockLift }: { block: Block; onEdit: (block: Block) => void; cellWidth: number; cellHeight: number; startHour: number; maxHour: number; blockLift: number }) {
  const [isHovered, setIsHovered] = useState(false);

  const top = (block.startTime - startHour) * cellHeight + cellHeight / 1.32 + blockLift;
  const left = block.day * cellWidth;
  const duration = block.endTime - block.startTime;
  const height = duration * cellHeight;

  const handleEditClick = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(block); };
  const handleDeleteClick = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(block); };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${cellWidth - 12}px`, height: `${height}px`, zIndex: 30 }}
    >
      <div className="text-white rounded p-1 text-sm h-full box-border relative select-none" style={{ backgroundColor: block.color || '#ef4444' }}>
        {isHovered && (
          <>
            <button
              onClick={handleEditClick}
              className="edit-button absolute bottom-1 right-8 w-5 h-5 bg-white text-red-500 rounded flex items-center justify-center text-xs hover:bg-gray-100"
              style={{ zIndex: 40 }}
            >
              ✎
            </button>
            <button
              onClick={handleDeleteClick}
              className="delete-button absolute bottom-1 right-1 w-5 h-5 bg-white text-red-500 rounded flex items-center justify-center text-xs hover:bg-gray-100"
              style={{ zIndex: 40 }}
            >
              ✕
            </button>
          </>
        )}
        <div className="font-semibold">{block.title || 'Block'}</div>
        {block.description && <div className="text-xs mt-0.5 opacity-90">{block.description}</div>}
      </div>
    </div>
  );
}

export default function Timeblocker() {
  const search = useSearchParams();
  const view = search?.get('view') ?? 'week';
  const { user } = useAuth();
  const startHour = 4;
  // show hours from startHour up through the next-day 3 AM (exclude the final 4 AM row)
  const hours = useMemo(() => hourRange(startHour, startHour + 23), [startHour]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // container refs to calculate cell sizes
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cellWidth, setCellWidth] = useState(120);
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const [cellHeight, setCellHeight] = useState(64);
  // restore header height so the header area sits above the 4 AM line
  // reduce headerHeight to tighten whitespace above the chart
  const headerHeight = 36;
  // lift the date labels upward to reduce top whitespace
  const headerLift = -16;
  // lift blocks upward to stay aligned after header height reduction
  const blockLift = -12;
  const desktopTimeColWidth = 50;
  const mobileTimeColWidth = 180;
  const [timeColWidth, setTimeColWidth] = useState<number>(mobileTimeColWidth);
  // runtime helpers: ensure we only load DB once
  const loadedOnce = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSupabaseResponse, setLastSupabaseResponse] = useState<any>(null);

  // in-memory timers and previous states are used (no persistent queue)

  // Load blocks from database on mount or when user changes, but only once
  React.useEffect(() => {
    const loadBlocks = async () => {
      if (!user) {
        setBlocks([]);
        setIsLoading(false);
        return;
      }

      // only load once per component lifecycle / session
      if (loadedOnce.current) {
        setIsLoading(false);
        return;
      }

      console.debug('Loading blocks for user', user?.id);
      try {
        const res = await supabase.from('blocks').select('*').eq('user_id', user.id);

        // log full response for debugging
        console.debug('Supabase load blocks response:', res);
        setLastSupabaseResponse(res);

        const { data, error, status } = res as any;
        if (error) {
          console.error('Error loading blocks:', { error, status, data });
          setBlocks([]);
        } else {
          // map database rows to our Block shape using the database column names
          const mapped = (data || []).map((r: any) => ({
            id: String(r.id),
            day: Number(r.day),
            startTime: Number(r.starttime),
            endTime: Number(r.endtime),
            title: r.title || '',
            description: r.description || '',
            color: r.color || r.colour || '#ef4444',
          }));
          console.debug('Mapped blocks:', mapped);
          setBlocks(mapped);
        }
      } catch (error) {
        console.error('Error loading blocks:', error);
        setBlocks([]);
      } finally {
        setIsLoading(false);
        loadedOnce.current = true;
      }
    };

    loadBlocks();
  }, [user]);

  // Previously there was a mount-time restore for persistent queued saves; removed.
  React.useEffect(() => {
    // no-op — persistent queue removed
  }, []);

  // Save block to database
  const saveBlockToDB = async (block: Block): Promise<{ success: boolean; data?: any; error?: any; status?: number }> => {
    if (!user) return { success: false, error: 'no-user' };

    try {
      const payload = {
        id: block.id,
        user_id: user.id,
        day: block.day,
        starttime: block.startTime,
        endtime: block.endTime,
        title: block.title || '',
        description: block.description || '',
        color: block.color || '#ef4444',
      };

      const res = await supabase.from('blocks').upsert([payload]).select();
      setLastSupabaseResponse(res);
      const { data, error, status } = res as any;

      if (error) {
        console.error('Error saving block:', { error, status, data, payload });
        return { success: false, error, status };
      }

      console.debug('Saved block to DB:', data);
      return { success: true, data, status };
    } catch (error) {
      console.error('Error saving block (exception):', error);
      return { success: false, error };
    }
  };

  // Drag & drop / per-block debounced saves removed.

  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<{ attempted: Block; overlapping: Block[] } | null>(null);

  const handleEdit = (block: Block) => {
    setEditingBlock(block);
  };

  const performSaveBlock = async (updatedBlock: Block) => {
    // optimistic update: apply immediately, then persist
    const existing = blocks.find((b) => b.id === updatedBlock.id);
    if (existing) {
      setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
    } else {
      setBlocks((prev) => [...prev, updatedBlock]);
    }

    const res = await saveBlockToDB(updatedBlock);
    if (!res.success) {
      // revert
      if (existing) {
        setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? existing : b)));
      } else {
        setBlocks((prev) => prev.filter((b) => b.id !== updatedBlock.id));
      }
      setSaveError('Failed to save block. Please try again.');
      window.setTimeout(() => setSaveError(null), 5000);
    } else {
      // merge canonical row if returned
      if (res.data && Array.isArray(res.data) && res.data[0]) {
        const r = res.data[0];
        const canonical: Block = {
          id: String(r.id),
          day: Number(r.day),
          startTime: Number(r.starttime),
          endTime: Number(r.endtime),
          title: r.title || '',
          description: r.description || '',
          color: r.color || r.colour || '#ef4444',
        };
        setBlocks((prev) => (prev.map((b) => (b.id === canonical.id ? canonical : b))));
      }
    }
    setEditingBlock(null);
  };

  const handleSaveBlock = async (updatedBlock: Block) => {
    // check for overlaps with other blocks on the same day
    const overlapping = blocks.filter((b) => b.id !== updatedBlock.id && b.day === updatedBlock.day && updatedBlock.startTime < b.endTime && updatedBlock.endTime > b.startTime);
    if (overlapping.length > 0) {
      // show a warning modal letting the user continue or go back to edit
      setOverlapWarning({ attempted: updatedBlock, overlapping });
      return;
    }

    await performSaveBlock(updatedBlock);
  };

  // Delete block from database (helper)
  const deleteBlockFromDB = async (blockId: string) => {
    if (!user) return { success: false, error: 'no-user' };

    try {
      const res = await supabase.from('blocks').delete().eq('id', blockId).eq('user_id', user.id).select();
      const { data, error, status } = res as any;
      if (error) {
        console.error('Error deleting block:', { error, status, data });
        return { success: false, error, status };
      }
      console.debug('Deleted block from DB:', { data });
      return { success: true, data, status };
    } catch (error) {
      console.error('Error deleting block:', error);
      return { success: false, error };
    }
  };

  const handleDeleteBlock = (id: string) => {
    deleteBlockFromDB(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setEditingBlock(null);
  };

  // helper to add a new block in column 0 at a default hour (clamped)
  const addBlock = () => {
    const id = String(Date.now());
    const defaultTime = 9; // 9 AM
    const maxHour = startHour + hours.length - 1;
    const startT = Math.max(startHour, Math.min(maxHour, defaultTime));
    const newBlock: Block = { id, day: 0, startTime: startT, endTime: startT + 1, title: '', description: '', color: '#ef4444' };
    setEditingBlock(newBlock);
  };

  // no drag-related timers to cleanup (dragging removed)

  // blocks intentionally empty by default (per request)

  // compute the visible days starting from an "effective today" which rolls over at 4 AM
  const computeEffectiveToday = (now: Date) => {
    const eff = new Date(now);
    // if local time is before 4am, treat it as previous day
    if (now.getHours() < 4) eff.setDate(eff.getDate() - 1);
    eff.setHours(0, 0, 0, 0);
    return eff;
  };

  const [effectiveToday, setEffectiveToday] = React.useState<Date>(() => computeEffectiveToday(new Date()));

  // schedule an update at the next 4am so the effectiveToday changes automatically
  React.useEffect(() => {
    const now = new Date();
    const next4 = new Date(now);
    next4.setHours(4, 0, 0, 0);
    if (next4 <= now) next4.setDate(next4.getDate() + 1);
    const ms = next4.getTime() - now.getTime();
    const t = window.setTimeout(() => {
      setEffectiveToday(computeEffectiveToday(new Date()));
    }, ms + 50); // slight buffer
    return () => window.clearTimeout(t);
  }, [effectiveToday]);

  const daysInfo = (view === 'week'
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(effectiveToday);
        d.setDate(effectiveToday.getDate() + i);
        return {
          short: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase().slice(0, 3),
          num: d.getDate(),
          date: d,
        };
      })
    : Array.from({ length: 2 }, (_, i) => {
        const d = new Date(effectiveToday);
        d.setDate(effectiveToday.getDate() + i);
        return {
          // label as Today / Tomorrow for day view
          short: i === 0 ? 'Today' : 'Tomorrow',
          num: d.getDate(),
          date: d,
        };
      }));

  // shrink the time column on larger screens to match the original desktop width; only use wide column on week view + mobile
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = (matches: boolean) => {
      const isDesktop = matches;
      const width = view === 'week' && !isDesktop ? mobileTimeColWidth : desktopTimeColWidth;
      setTimeColWidth(width);
    };
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else if ((mq as any).addListener) {
      (mq as any).addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler);
      } else if ((mq as any).removeListener) {
        (mq as any).removeListener(handler);
      }
    };
  }, [view]);

  // compute flexible cell width so columns spread across available space
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => {
      const total = el.clientWidth;
      const days = Math.max(1, daysInfo.length);
      const available = Math.max(0, total - timeColWidth);
      const cw = available / days;
      // ensure a minimum width but allow columns to expand to fill space
      const clamped = Math.max(160, cw);
      setCellWidth(clamped);
      setGridWidth(clamped * days);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [containerRef, daysInfo.length, timeColWidth]);

  return (
    <div className="w-full h-full" ref={containerRef} style={{ overflowX: view === 'week' ? 'auto' : 'hidden' }}>
      {/* top bar removed; Week/Day controls moved to Navbar */}

      <div className="w-full h-full">
        {/* header */}
        <div className="flex" style={{ height: headerHeight }}>
          <div style={{ width: timeColWidth }} />
          {/* day header placeholders are printed over absolute layer below */}
          <div style={{ width: gridWidth ?? daysInfo.length * cellWidth }} />
        </div>

        {saveError && (
          <div className="w-full px-4 py-2 bg-red-100 border border-red-200 text-red-800 text-sm" style={{ boxSizing: 'border-box' }}>
            {saveError}
          </div>
        )}

              {/* debug panel removed */}

        {/* grid */}
        <div style={{ display: 'flex' }}>
          {/* time column */}
          <div style={{ width: timeColWidth, position: 'relative' }}>
            <div style={{ height: headerHeight }} />
            <div style={{ position: 'relative', height: hours.length * cellHeight }}>
              {hours.map((h, rowIdx) => (
                <div
                  key={h}
                  style={{ position: 'absolute', top: rowIdx * cellHeight - cellHeight / 2, height: cellHeight, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                  className="text-xs text-gray-400"
                >
                  {formatHour(h)}
                </div>
              ))}
            </div>
          </div>

          {/* day columns */}
          <div style={{ position: 'relative', width: gridWidth ? `${gridWidth}px` : `calc(100% - ${timeColWidth}px)` }}>
            {hours.map((h, rowIdx) => (
              <div key={h} style={{ position: 'absolute', left: 0, width: gridWidth ?? daysInfo.length * cellWidth, top: headerHeight + rowIdx * cellHeight, height: 1, background: '#eee' }} />
            ))}

            {/* vertical separators between day columns */}
            {Array.from({ length: Math.max(0, daysInfo.length - 1) }).map((_, i) => (
              <div key={`v-${i}`} style={{ position: 'absolute', left: (i + 1) * cellWidth, top: headerHeight, bottom: 0, width: 1, background: '#eee' }} />
            ))}

            {/* subtle shading for the next-day early hours (midnight..4am) */}
            {(() => {
              const nextDayStartIdx = hours.findIndex((hh) => hh >= 24);
              if (nextDayStartIdx >= 0) {
                const top = headerHeight + nextDayStartIdx * cellHeight;
                const height = (hours.length - nextDayStartIdx) * cellHeight;
                return <div style={{ position: 'absolute', left: 0, top, width: gridWidth ?? daysInfo.length * cellWidth, height, background: 'rgba(0,0,0,0.03)', pointerEvents: 'none' }} />;
              }
              return null;
            })()}

            {/* vertical separator between time labels and grid (no outer border) */}
            <div style={{ position: 'absolute', left: 0, top: headerHeight, bottom: 0, width: 1, background: '#e6e6e6' }} />

            {/* day headers positioned over the background */}
              <div style={{ position: 'absolute', left: 0, top: headerLift, height: headerHeight, right: 0 }}>
                {daysInfo.map((d, idx) => (
                  <div key={idx} style={{ position: 'absolute', left: idx * cellWidth, width: cellWidth, top: 0, height: headerHeight, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, paddingBottom: 0 }}>
                    <div className={view === 'day' ? 'text-2xl text-gray-600 font-bold' : 'text-sm text-gray-600 font-bold'} style={{ marginBottom: 0 }}>{d.short}</div>
                      {view === 'week' && (
                        <div className="text-2xl font-semibold text-gray-700" style={{ marginTop: -2 }}>{d.num}</div>
                      )}
                  </div>
                ))}
              </div>

            {/* blocks positioned absolutely relative to grid area */}
            <div style={{ position: 'absolute', left: 0, top: 0, width: gridWidth ?? daysInfo.length * cellWidth, height: hours.length * cellHeight }}>
              {blocks
                .filter((b) => typeof b.day === 'number' && b.day >= 0 && b.day < daysInfo.length)
                .map((b) => (
                  <DraggableBlock key={b.id} block={b} onEdit={handleEdit} cellWidth={cellWidth} cellHeight={cellHeight} startHour={startHour} maxHour={startHour + hours.length - 1} blockLift={blockLift} />
                ))}
            </div>
          </div>
        </div>
      </div>
      {editingBlock && (
        <BlockEditModal
          block={editingBlock}
          daysInfo={daysInfo}
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
          onClose={() => setEditingBlock(null)}
        />
      )}

      {overlapWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[110]" onClick={() => setOverlapWarning(null)}>
          <div className="bg-white rounded-lg p-6 w-96 max-w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Overlap warning</h2>
            <p className="text-sm text-gray-700 mb-4">The block you're creating/editing overlaps with the following block(s). Do you want to continue and save anyway, or go back and adjust the times?</p>
            <div className="mb-3 text-sm">
              {overlapWarning.overlapping.map((b) => (
                <div key={b.id} className="mb-1">
                  <strong className="mr-2">{b.title || 'Block'}</strong>
                  <span className="text-gray-600">Day {b.day} — {b.startTime} to {b.endTime}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  // go back to edit
                  setEditingBlock(overlapWarning.attempted);
                  setOverlapWarning(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Go back
              </button>
              <button
                onClick={async () => {
                  // continue and save
                  const attempted = overlapWarning.attempted;
                  setOverlapWarning(null);
                  await performSaveBlock(attempted);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* floating add button - fixed position so it stays visible when scrolling */}
      <button onClick={addBlock} aria-label="Add block" className="fixed right-6 bottom-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50">
        <span style={{ fontSize: 20, lineHeight: 0 }}>+</span>
      </button>
    </div>
  );
}
