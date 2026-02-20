"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { Block, DayInfo } from '@/types/block';
import { hourRange, formatHour, formatCurrentTime, timeToDecimal, decimalToTime } from '@/lib/timeUtils';
import { loadBlocksFromDB, saveBlockToDB, deleteBlockFromDB, mapDBRowToBlock, detectBlockOverlaps } from '@/lib/blockOperations';
import { useEffectiveToday, useCurrentTime, useDaysInfo, useResponsiveTimeColumn, useGridLayout } from '@/hooks/useTimeblocking';
import { useCompactView } from '../hooks/useCompactView';
import BlockEditModal from './BlockEditModal';
import DraggableBlock from './DraggableBlock';
import OverlapWarningModal from './OverlapWarningModal';

export default function Timeblocker() {
  const search = useSearchParams();
  const view = search?.get('view') ?? 'week';
  const { user } = useAuth();
  const startHour = 4;
  const hours = useMemo(() => hourRange(startHour, startHour + 23), [startHour]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellHeight, setCellHeight] = useState(64);
  const { compact, toggleCompact } = useCompactView();
  const headerHeight = 36;
  const headerLift = -16;
  const blockLift = -12;
  const desktopTimeColWidth = 50;
  const mobileTimeColWidth = 180;
  
  const loadedOnce = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<{ attempted: Block; overlapping: Block[] } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRepeatCreate, setShowRepeatCreate] = useState(false);
  const [showRepeatManage, setShowRepeatManage] = useState(false);

  type RepeatRule = {
    id: string;
    title: string;
    description: string;
    color: string;
    startTime: number;
    endTime: number;
    type: 'weekly' | 'interval';
    weekdays?: number[]; // 0=Sun..6=Sat
    intervalDays?: number;
    startDate?: string; // YYYY-MM-DD
    createdAt: string;
  };

  const REPEAT_STORAGE_KEY = 'timeblocker.repeatRules';
  const [repeatRules, setRepeatRules] = useState<RepeatRule[]>([]);
  const [repeatTitle, setRepeatTitle] = useState('');
  const [repeatDescription, setRepeatDescription] = useState('');
  const [repeatColor, setRepeatColor] = useState('#3b82f6');
  const [repeatStartTime, setRepeatStartTime] = useState('09:00');
  const [repeatEndTime, setRepeatEndTime] = useState('10:00');
  const [repeatType, setRepeatType] = useState<'weekly' | 'interval'>('weekly');
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([new Date().getDay()]);
  const [repeatIntervalDays, setRepeatIntervalDays] = useState(1);
  const [repeatStartDate, setRepeatStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [repeatError, setRepeatError] = useState<string | null>(null);
  const repeatCreateInFlight = useRef(false);

  // Custom hooks
  const timeColWidth = useResponsiveTimeColumn(view, desktopTimeColWidth, mobileTimeColWidth);
  const effectiveToday = useEffectiveToday();
  const currentTime = useCurrentTime();
  const daysInfo = useDaysInfo(view, effectiveToday);
  const { cellWidth, gridWidth } = useGridLayout(containerRef, daysInfo.length, timeColWidth);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(REPEAT_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as RepeatRule[];
      if (Array.isArray(parsed)) setRepeatRules(parsed);
    } catch {
      window.localStorage.removeItem(REPEAT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(REPEAT_STORAGE_KEY, JSON.stringify(repeatRules));
  }, [repeatRules]);


  // Load blocks from database
  React.useEffect(() => {
    const loadBlocks = async () => {
      if (!user) {
        setBlocks([]);
        setIsLoading(false);
        return;
      }

      if (loadedOnce.current) {
        setIsLoading(false);
        return;
      }

      try {
        const blocks = await loadBlocksFromDB(user.id);
        setBlocks(blocks);
      } catch (error: any) {
        console.error('Error loading blocks:', error);
        setSaveError(error.message || 'Failed to load blocks');
        setBlocks([]);
      } finally {
        setIsLoading(false);
        loadedOnce.current = true;
      }
    };

    loadBlocks();
  }, [user]);

  useEffect(() => {
    setCellHeight(compact ? 32 : 64);
  }, [compact]);

  const buildDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const shouldCreateForDate = (rule: RepeatRule, date: Date) => {
    if (rule.type === 'weekly') {
      const weekday = date.getDay();
      return (rule.weekdays || []).includes(weekday);
    }
    const start = rule.startDate ? new Date(`${rule.startDate}T00:00:00`) : null;
    if (!start || !rule.intervalDays || rule.intervalDays < 1) return false;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = dayStart.getTime() - start.getTime();
    if (diffMs < 0) return false;
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return diffDays % rule.intervalDays === 0;
  };

  const formatRuleSchedule = (rule: RepeatRule) => {
    if (rule.type === 'weekly') {
      const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = (rule.weekdays || []).map((d) => labels[d]).join(', ');
      return `Weekly: ${days || 'No days selected'}`;
    }
    return `Every ${rule.intervalDays} day(s) starting ${rule.startDate}`;
  };

  useEffect(() => {
    const createRepeatingBlocks = async () => {
      if (!user || isLoading || repeatRules.length === 0) return;
      if (repeatCreateInFlight.current) return;
      repeatCreateInFlight.current = true;

      try {
        const existingIds = new Set(blocks.map((b) => b.id));
        const createdBlocks: Block[] = [];

        for (const dayInfo of daysInfo) {
          const dateKey = buildDateKey(dayInfo.date);
          for (const rule of repeatRules) {
            if (!shouldCreateForDate(rule, dayInfo.date)) continue;

            const blockId = `repeat-${rule.id}-${dateKey}`;
            if (existingIds.has(blockId)) continue;

            if (rule.endTime <= rule.startTime) continue;

            const newBlock: Block = {
              id: blockId,
              day: daysInfo.indexOf(dayInfo),
              startTime: rule.startTime,
              endTime: rule.endTime,
              title: rule.title,
              description: rule.description,
              color: rule.color,
            };

            const overlaps = detectBlockOverlaps([...blocks, ...createdBlocks], newBlock);
            if (overlaps.length > 0) continue;

            const res = await saveBlockToDB(newBlock, user.id);
            if (res.success) {
              if (res.data && Array.isArray(res.data) && res.data[0]) {
                createdBlocks.push(mapDBRowToBlock(res.data[0]));
              } else {
                createdBlocks.push(newBlock);
              }
              existingIds.add(blockId);
            }
          }
        }

        if (createdBlocks.length > 0) {
          setBlocks((prev) => [...prev, ...createdBlocks]);
        }
      } finally {
        repeatCreateInFlight.current = false;
      }
    };

    createRepeatingBlocks();
  }, [user, isLoading, repeatRules, daysInfo, blocks]);

  const handleEdit = (block: Block) => {
    setEditingBlock(block);
  };

  const performSaveBlock = async (updatedBlock: Block) => {
    const existing = blocks.find((b) => b.id === updatedBlock.id);
    if (existing) {
      setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
    } else {
      setBlocks((prev) => [...prev, updatedBlock]);
    }

    const res = await saveBlockToDB(updatedBlock, user!.id);
    if (!res.success) {
      if (existing) {
        setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? existing : b)));
      } else {
        setBlocks((prev) => prev.filter((b) => b.id !== updatedBlock.id));
      }
      setSaveError('Failed to save block. Please try again.');
      window.setTimeout(() => setSaveError(null), 5000);
    } else {
      if (res.data && Array.isArray(res.data) && res.data[0]) {
        const canonical = mapDBRowToBlock(res.data[0]);
        setBlocks((prev) => (prev.map((b) => (b.id === canonical.id ? canonical : b))));
      }
    }
    setEditingBlock(null);
  };

  const handleSaveBlock = async (updatedBlock: Block) => {
    const overlapping = detectBlockOverlaps(blocks, updatedBlock);
    if (overlapping.length > 0) {
      setOverlapWarning({ attempted: updatedBlock, overlapping });
      return;
    }
    await performSaveBlock(updatedBlock);
  };

  const handleDeleteBlock = async (id: string) => {
    if (!user) return;
    await deleteBlockFromDB(id, user.id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setEditingBlock(null);
  };

  const addBlock = () => {
    const id = String(Date.now());
    const defaultTime = 9;
    const maxHour = startHour + hours.length - 1;
    const startT = Math.max(startHour, Math.min(maxHour, defaultTime));
    const newBlock: Block = { id, day: 0, startTime: startT, endTime: startT + 1, title: '', description: '', color: '#3b82f6' };
    setEditingBlock(newBlock);
  };

  const resetRepeatForm = () => {
    setRepeatTitle('');
    setRepeatDescription('');
    setRepeatColor('#3b82f6');
    setRepeatStartTime('09:00');
    setRepeatEndTime('10:00');
    setRepeatType('weekly');
    setRepeatWeekdays([new Date().getDay()]);
    setRepeatIntervalDays(1);
    setRepeatStartDate(new Date().toISOString().slice(0, 10));
    setRepeatError(null);
  };

  const handleCreateRepeat = () => {
    setRepeatError(null);
    const start = timeToDecimal(repeatStartTime);
    const end = timeToDecimal(repeatEndTime);

    if (start === null || end === null) {
      setRepeatError('Please enter valid times in HH:MM format.');
      return;
    }
    if (end <= start) {
      setRepeatError('End time must be after start time.');
      return;
    }
    if (repeatType === 'weekly' && repeatWeekdays.length === 0) {
      setRepeatError('Select at least one weekday.');
      return;
    }
    if (repeatType === 'interval' && repeatIntervalDays < 1) {
      setRepeatError('Interval must be at least 1 day.');
      return;
    }

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now());

    const rule: RepeatRule = {
      id,
      title: repeatTitle.trim() || 'Repeating Task',
      description: repeatDescription.trim(),
      color: repeatColor,
      startTime: start,
      endTime: end,
      type: repeatType,
      weekdays: repeatType === 'weekly' ? repeatWeekdays : undefined,
      intervalDays: repeatType === 'interval' ? repeatIntervalDays : undefined,
      startDate: repeatType === 'interval' ? repeatStartDate : undefined,
      createdAt: new Date().toISOString(),
    };

    setRepeatRules((prev) => [...prev, rule]);
    setShowRepeatCreate(false);
    resetRepeatForm();
  };

  const handleDeleteRepeat = (id: string) => {
    setRepeatRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="w-full h-full relative isolate" ref={containerRef} style={{ overflowX: view === 'week' ? 'auto' : 'hidden' }}>
      <div className="w-full h-full relative z-0">
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
                (!compact || rowIdx % 2 === 0) ? (
                  <div
                    key={h}
                    style={{ position: 'absolute', top: rowIdx * cellHeight - cellHeight / 2, height: cellHeight, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                    className="text-xs text-gray-400"
                  >
                    {formatHour(h)}
                  </div>
                ) : null
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
                  <DraggableBlock
                    key={b.id}
                    block={b}
                    onEdit={handleEdit}
                    onDelete={() => handleDeleteBlock(b.id)}
                    cellWidth={cellWidth}
                    cellHeight={cellHeight}
                    startHour={startHour}
                    maxHour={startHour + hours.length - 1}
                    blockLift={blockLift}
                    headerHeight={headerHeight}
                    compact={compact}
                  />
                ))}
            </div>

            {/* Current time indicator line */}
            {(() => {
              const now = currentTime;
              const currentHour = now.getHours() + now.getMinutes() / 60;
              
              // Check if current time is within our displayed range
              if (currentHour >= startHour && currentHour < startHour + hours.length) {
                const top = headerHeight + (currentHour - startHour) * cellHeight;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: `${top}px`,
                      width: gridWidth ?? daysInfo.length * cellWidth,
                      height: 2,
                      background: '#b91c1c',
                      zIndex: 10,
                      pointerEvents: 'none',
                      boxShadow: '0 0 4px rgba(185, 28, 28, 0.5)',
                    }}
                  >
                    {/* Circle indicator at the start of the line */}
                    <div
                      title="Current time"
                      style={{
                        position: 'absolute',
                        left: -4,
                        top: -3,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#b91c1c',
                        boxShadow: '0 0 4px rgba(185, 28, 28, 0.8)',
                        cursor: 'default',
                      }}
                    />
                  </div>
                );
              }
              return null;
            })()}
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
        <OverlapWarningModal
          attempted={overlapWarning.attempted}
          overlapping={overlapWarning.overlapping}
          onContinue={async () => {
            const attempted = overlapWarning.attempted;
            setOverlapWarning(null);
            await performSaveBlock(attempted);
          }}
          onGoBack={() => {
            setEditingBlock(overlapWarning.attempted);
            setOverlapWarning(null);
          }}
          onClose={() => setOverlapWarning(null)}
        />
      )}
      {/* floating settings button */}
      <button onClick={() => setShowSettings(true)} aria-label="Settings" className="fixed right-6 bottom-24 w-12 h-12 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-lg flex items-center justify-center z-50">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[120]"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded p-3">
                <h3 className="text-lg font-semibold text-gray-800">Repeating Tasks</h3>
                <p className="text-sm text-gray-600 mb-3">Create tasks that repeat weekly or every X days.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      resetRepeatForm();
                      setShowSettings(false);
                      setShowRepeatCreate(true);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm w-full sm:w-auto"
                  >
                    Create Repeating Task
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setShowRepeatManage(true);
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm w-full sm:w-auto"
                  >
                    Manage / Delete
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Compact View</h3>
                  <p className="text-sm text-gray-600">Reduce the height of calendar cells</p>
                </div>
                <button
                  onClick={toggleCompact}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    compact ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle compact view"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      compact ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {showRepeatCreate && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[120]"
          onClick={() => setShowRepeatCreate(false)}
        >
          <div
            className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Create Repeating Task</h2>
              <button
                onClick={() => setShowRepeatCreate(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {repeatError && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
                {repeatError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={repeatTitle}
                  onChange={(e) => setRepeatTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="Repeating Task"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={repeatDescription}
                  onChange={(e) => setRepeatDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={repeatColor}
                    onChange={(e) => setRepeatColor(e.target.value)}
                    className="w-10 h-10 p-0 border-0 bg-transparent"
                    aria-label="Select color"
                  />
                  <span className="text-sm text-gray-600">{repeatColor.toUpperCase()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start (HH:MM)</label>
                  <input
                    type="text"
                    value={repeatStartTime}
                    onChange={(e) => setRepeatStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    placeholder="09:00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End (HH:MM)</label>
                  <input
                    type="text"
                    value={repeatEndTime}
                    onChange={(e) => setRepeatEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    placeholder="10:00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Type</label>
                <select
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value as 'weekly' | 'interval')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                >
                  <option value="weekly">Day of the Week</option>
                  <option value="interval">Repeat every X days</option>
                </select>
              </div>

              {repeatType === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, idx) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setRepeatWeekdays((prev) =>
                            prev.includes(idx)
                              ? prev.filter((d) => d !== idx)
                              : [...prev, idx]
                          );
                        }}
                        className={`px-2 py-1 rounded border text-sm ${
                          repeatWeekdays.includes(idx)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {repeatType === 'interval' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Every (days)</label>
                    <input
                      type="number"
                      min={1}
                      value={repeatIntervalDays}
                      onChange={(e) => setRepeatIntervalDays(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={repeatStartDate}
                      onChange={(e) => setRepeatStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowRepeatCreate(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRepeat}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showRepeatManage && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[120]"
          onClick={() => setShowRepeatManage(false)}
        >
          <div
            className="bg-white rounded-lg p-6 shadow-xl max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Manage Repeating Tasks</h2>
              <button
                onClick={() => setShowRepeatManage(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {repeatRules.length === 0 ? (
              <p className="text-sm text-gray-600">No repeating tasks yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {repeatRules.map((rule) => (
                  <div key={rule.id} className="border border-gray-200 rounded p-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-800">{rule.title}</div>
                      {rule.description && <div className="text-sm text-gray-600">{rule.description}</div>}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatRuleSchedule(rule)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {decimalToTime(rule.startTime)} - {decimalToTime(rule.endTime)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRepeat(rule.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
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
