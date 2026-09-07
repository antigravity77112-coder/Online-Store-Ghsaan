import React from 'react';

export default function QuickAddFeedback({ visible, message }) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 max-w-[min(90vw,18rem)] px-4 py-2.5 rounded-xl bg-slate-900/95 text-white text-sm font-medium text-center shadow-lg motion-reduce:transition-none"
    >
      {message}
    </div>
  );
}
