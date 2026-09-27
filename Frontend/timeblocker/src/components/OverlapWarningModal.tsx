"use client";

import type { Block } from "@/types/block";

type OverlapWarningProps = {
  attempted: Block;
  overlapping: Block[];
  onContinue: () => void;
  onGoBack: () => void;
  onClose: () => void;
};

export default function OverlapWarningModal({
  attempted: _attempted,
  overlapping,
  onContinue,
  onGoBack,
  onClose,
}: OverlapWarningProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[110]">
      <button
        type="button"
        aria-label="Close overlap warning"
        onClick={onClose}
        className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm border-0 p-0 cursor-default"
      />
      <div
        aria-modal="true"
        className="bg-white rounded-lg p-6 w-96 max-w-full relative"
        role="dialog"
      >
        <h2 className="text-lg font-bold mb-2">Overlap warning</h2>
        <p className="text-sm text-gray-700 mb-4">
          The block you're creating/editing overlaps with the following
          block(s). Do you want to continue and save anyway, or go back and
          adjust the times?
        </p>
        <div className="mb-3 text-sm">
          {overlapping.map((b) => (
            <div key={b.id} className="mb-1">
              <strong className="mr-2">{b.title || "Block"}</strong>
              <span className="text-gray-600">
                Day {b.day} — {b.startTime} to {b.endTime}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onGoBack}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
