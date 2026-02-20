"use client";

import React, { useState, useRef } from 'react';
import { Block, DayInfo } from '@/types/block';
import { decimalToTime, timeToDecimal } from '@/lib/timeUtils';

type BlockEditModalProps = {
  block: Block;
  daysInfo: DayInfo[];
  onSave: (block: Block) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export default function BlockEditModal({ block, daysInfo, onSave, onDelete, onClose }: BlockEditModalProps) {
  const isNewBlock = !block.title && !block.description;
  const initialStart = isNewBlock ? null : block.startTime;
  const initialEnd = isNewBlock ? null : block.endTime;

  const [title, setTitle] = useState(block.title || '');
  const [description, setDescription] = useState(block.description || '');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(block.day);
  const [startTime, setStartTime] = useState<number | null>(initialStart);
  const [endTime, setEndTime] = useState<number | null>(initialEnd);
  const [color, setColor] = useState<string>(block.color || '#3b82f6');
  const modalRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{x:number;y:number;origX:number|null;origY:number|null;origW:number;origH:number}|null>(null);
  const [pos, setPos] = useState<{x:number|null;y:number|null}>({ x: null, y: null });
  const suppressOverlayClickRef = useRef(false);

  // Calculate duration in hours and minutes from startTime and endTime
  const calculateDuration = (): { hours: number; minutes: number } => {
    if (startTime === null || endTime === null) return { hours: 0, minutes: 0 };
    const diff = endTime - startTime;
    const hours = Math.floor(diff);
    const minutes = Math.round((diff % 1) * 60);
    return { hours, minutes };
  };

  const duration = calculateDuration();
  const to12Hour = (decimal: number | null): { time: string; period: 'AM' | 'PM' } => {
    if (decimal === null) return { time: '', period: 'PM' };
    const h24 = Math.floor(decimal % 24);
    const minutes = Math.round((decimal % 1) * 60);
    let period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    let hour12 = h24 % 12;
    if (hour12 === 0) hour12 = 12;
    return {
      time: `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      period,
    };
  };

  const parse12Hour = (timeStr: string, period: 'AM' | 'PM', allowNextDay = false): number | null => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours < 1 || hours > 12 || minutes >= 60) return null;
    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }
    let decimal = hours + minutes / 60;
    if (allowNextDay && decimal < 4) {
      decimal += 24;
    }
    return decimal;
  };

  const initStart = to12Hour(startTime);
  const initEnd = to12Hour(endTime);
  const [startTimeInput, setStartTimeInput] = useState<string>(initStart.time || '');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>(initStart.time ? initStart.period : 'PM');
  const [endTimeInput, setEndTimeInput] = useState<string>(initEnd.time || '');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>(initEnd.time ? initEnd.period : 'PM');
  const [durationHours, setDurationHours] = useState<string>(String(duration.hours));
  const [durationMinutes, setDurationMinutes] = useState<string>(String(duration.minutes));

  // Update end time when start time or duration changes
  const handleStartTimeChange = (value: string) => {
    setStartTimeInput(value);
    const decimal = parse12Hour(value, startPeriod);
    if (decimal !== null) {
      setStartTime(decimal);
      // Update end time based on current duration
      const dHours = parseInt(durationHours, 10) || 0;
      const dMinutes = parseInt(durationMinutes, 10) || 0;
      const newEnd = decimal + dHours + dMinutes / 60;
      setEndTime(newEnd);
      const { time, period } = to12Hour(newEnd);
      setEndTimeInput(time);
      setEndPeriod(period);
    }
  };

  const handleEndTimeChange = (value: string) => {
    setEndTimeInput(value);
    // Allow next-day times (e.g., 1:00 AM after midnight)
    const decimal = parse12Hour(value, endPeriod, true);
    if (decimal !== null && startTime !== null) {
      setEndTime(decimal);
      // Update duration
      const diff = decimal - startTime;
      const hours = Math.floor(diff);
      const minutes = Math.round((diff % 1) * 60);
      setDurationHours(String(hours));
      setDurationMinutes(String(minutes));
    }
  };

  const handleDurationChange = (hours: string, minutes: string) => {
    setDurationHours(hours);
    setDurationMinutes(minutes);
    if (startTime !== null) {
      const dHours = parseInt(hours, 10) || 0;
      const dMinutes = parseInt(minutes, 10) || 0;
      const newEnd = startTime + dHours + dMinutes / 60;
      setEndTime(newEnd);
      const { time, period } = to12Hour(newEnd);
      setEndTimeInput(time);
      setEndPeriod(period);
    }
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
            <button
              type="button"
              onClick={() => setShowDescriptionModal(true)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-left text-gray-500 hover:bg-gray-50"
            >
              {description || 'Click to add description...'}
            </button>
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
              {/* Preset color boxes */}
              {[
                { name: 'Blue', hex: '#3b82f6' },
                { name: 'Red', hex: '#ef4444' },
                { name: 'Orange', hex: '#f97316' },
                { name: 'Green', hex: '#22c55e' },
                { name: 'Pink', hex: '#ec4899' },
                { name: 'Purple', hex: '#a855f7' },
                { name: 'Cyan', hex: '#06b6d4' },
                { name: 'Yellow', hex: '#eab308' },
              ].map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setColor(preset.hex)}
                  title={preset.name}
                  className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: preset.hex,
                    borderColor: color === preset.hex ? '#000' : 'transparent',
                  }}
                  aria-label={`Select ${preset.name} color`}
                />
              ))}
              {/* Color wheel picker */}
              <label
                title="Custom color picker"
                className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer flex items-center justify-center bg-white hover:bg-gray-50 transition-all hover:scale-110 overflow-hidden"
              >
                <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="colorWheel">
                      <stop offset="0%" stopColor="white" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>
                  {/* Color wheel segments */}
                  <circle cx="50" cy="50" r="45" fill="url(#colorWheel)" />
                  <path d="M50,50 L95,50 A45,45 0 0,1 81.82,81.82 Z" fill="#ff0000" opacity="0.8" />
                  <path d="M50,50 L81.82,81.82 A45,45 0 0,1 50,95 Z" fill="#ff8800" opacity="0.8" />
                  <path d="M50,50 L50,95 A45,45 0 0,1 18.18,81.82 Z" fill="#ffff00" opacity="0.8" />
                  <path d="M50,50 L18.18,81.82 A45,45 0 0,1 5,50 Z" fill="#00ff00" opacity="0.8" />
                  <path d="M50,50 L5,50 A45,45 0 0,1 18.18,18.18 Z" fill="#00ffff" opacity="0.8" />
                  <path d="M50,50 L18.18,18.18 A45,45 0 0,1 50,5 Z" fill="#0000ff" opacity="0.8" />
                  <path d="M50,50 L50,5 A45,45 0 0,1 81.82,18.18 Z" fill="#8800ff" opacity="0.8" />
                  <path d="M50,50 L81.82,18.18 A45,45 0 0,1 95,50 Z" fill="#ff00ff" opacity="0.8" />
                  <circle cx="50" cy="50" r="15" fill="white" opacity="0.9" />
                </svg>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-0 h-0 opacity-0 absolute"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (HH:MM)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                placeholder="09:00"
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
              />
              <select
                value={startPeriod}
                onChange={(e) => {
                  const period = e.target.value as 'AM' | 'PM';
                  setStartPeriod(period);
                  const dec = parse12Hour(startTimeInput, period);
                  if (dec !== null) {
                    setStartTime(dec);
                    const dHours = parseInt(durationHours, 10) || 0;
                    const dMinutes = parseInt(durationMinutes, 10) || 0;
                    const newEnd = dec + dHours + dMinutes / 60;
                    setEndTime(newEnd);
                    const { time, period: endP } = to12Hour(newEnd);
                    setEndTimeInput(time);
                    setEndPeriod(endP);
                  }
                }}
                className="border border-gray-300 rounded px-2 py-2 text-gray-900"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  value={durationHours}
                  onChange={(e) => handleDurationChange(e.target.value, durationMinutes)}
                  placeholder="Hours"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
                />
                <label className="text-xs text-gray-500 mt-1 block">Hours</label>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationMinutes}
                  onChange={(e) => handleDurationChange(durationHours, e.target.value)}
                  placeholder="Minutes"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
                />    
                <label className="text-xs text-gray-500 mt-1 block">Minutes</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time (HH:MM)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={endTimeInput}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                placeholder="10:00"
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
              />
              <select
                value={endPeriod}
                onChange={(e) => {
                  const period = e.target.value as 'AM' | 'PM';
                  setEndPeriod(period);
                  const dec = parse12Hour(endTimeInput, period, true);
                  if (dec !== null && startTime !== null) {
                    setEndTime(dec);
                    const diff = dec - startTime;
                    const hours = Math.floor(diff);
                    const minutes = Math.round((diff % 1) * 60);
                    setDurationHours(String(hours));
                    setDurationMinutes(String(minutes));
                  }
                }}
                className="border border-gray-300 rounded px-2 py-2 text-gray-900"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
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

      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[110]" onClick={() => setShowDescriptionModal(false)}>
          <div className="bg-white rounded-lg p-6 w-96 max-w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Description</h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 select-text"
              placeholder="Enter description"
              rows={6}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
