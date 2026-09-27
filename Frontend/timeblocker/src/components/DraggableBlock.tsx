"use client";

import type React from "react";
import type { Block } from "@/types/block";

type DraggableBlockProps = {
  block: Block;
  onEdit: (block: Block) => void;
  onDelete: (block: Block) => void;
  cellWidth: number;
  cellHeight: number;
  startHour: number;
  blockLift: number;
  headerHeight: number;
  compact: boolean;
};

export default function DraggableBlock({
  block,
  onEdit,
  onDelete,
  cellWidth,
  cellHeight,
  startHour,
  blockLift,
  headerHeight,
  compact,
}: DraggableBlockProps) {
  // Keep the block label clear of the time grid line.
  const topOffset = compact ? cellHeight * (23 / 60) : cellHeight * (12 / 60);
  const top =
    headerHeight +
    (block.startTime - startHour) * cellHeight +
    topOffset +
    blockLift;
  const left = block.day * cellWidth;
  const duration = block.endTime - block.startTime;
  const height = duration * cellHeight;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(block);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(block);
  };

  return (
    <div
      className="group"
      style={{
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
        width: `${cellWidth}px`,
        height: `${height}px`,
        zIndex: 5,
      }}
    >
      <div
        className="text-white rounded p-1 text-sm h-full box-border relative select-none"
        style={{ backgroundColor: block.color || "#3b82f6" }}
      >
        <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleEditClick}
            className="edit-button absolute bottom-1 right-8 w-5 h-5 bg-white text-red-500 rounded flex items-center justify-center text-xs hover:bg-gray-100"
            style={{ zIndex: 15 }}
          >
            ✎
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="delete-button absolute bottom-1 right-1 w-5 h-5 bg-white text-red-500 rounded flex items-center justify-center text-xs hover:bg-gray-100"
            style={{ zIndex: 15 }}
          >
            ✕
          </button>
        </div>
        <div className="font-semibold">{block.title || "Block"}</div>
        {block.description && (
          <div className="text-xs mt-0.5 opacity-90">{block.description}</div>
        )}
      </div>
    </div>
  );
}
