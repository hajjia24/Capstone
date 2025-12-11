"use client";

import React, { useState } from 'react';
import { Block } from '@/types/block';

type DraggableBlockProps = {
  block: Block;
  onEdit: (block: Block) => void;
  cellWidth: number;
  cellHeight: number;
  startHour: number;
  maxHour: number;
  blockLift: number;
  headerHeight: number;
  compact: boolean;
};

export default function DraggableBlock({ 
  block, 
  onEdit, 
  cellWidth, 
  cellHeight, 
  startHour, 
  maxHour, 
  blockLift,
  headerHeight,
  compact
}: DraggableBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Compact view offset: ~23 minutes; Normal view: raise by ~35 minutes from prior
  const topOffset = compact 
    ? cellHeight * (23 / 60) 
    : cellHeight * (12 / 60);
  const top = headerHeight + (block.startTime - startHour) * cellHeight + topOffset + blockLift;
  const left = block.day * cellWidth;
  const duration = block.endTime - block.startTime;
  const height = duration * cellHeight;

  const handleEditClick = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    onEdit(block); 
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    onEdit(block); 
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        position: 'absolute', 
        left: `${left}px`, 
        top: `${top}px`, 
        width: `${cellWidth}px`, 
        height: `${height}px`, 
        zIndex: 30 
      }}
    >
      <div 
        className="text-white rounded p-1 text-sm h-full box-border relative select-none" 
        style={{ backgroundColor: block.color || '#3b82f6' }}
      >
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
