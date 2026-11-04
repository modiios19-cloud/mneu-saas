import React from 'react';

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* Header Skeleton */}
      <div className="w-full max-w-xl mx-auto px-6 pt-8 pb-4 flex flex-col items-center gap-3 border-b border-zinc-100 animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-zinc-200" />
        <div className="h-5 w-36 rounded-md bg-zinc-200" />
        <div className="flex gap-6 mt-4 w-full justify-center">
          <div className="h-4 w-20 rounded bg-zinc-200" />
          <div className="h-4 w-20 rounded bg-zinc-200" />
          <div className="h-4 w-20 rounded bg-zinc-200" />
        </div>
      </div>

      {/* Main Skeleton List */}
      <div className="w-full max-w-xl mx-auto px-6 py-8 space-y-6 animate-pulse">
        <div className="flex justify-between items-baseline pb-3 border-b border-zinc-100">
          <div className="h-6 w-28 rounded bg-zinc-200" />
          <div className="h-3 w-20 rounded bg-zinc-100" />
        </div>

        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-4 py-4 border-b border-zinc-100">
            <div className="w-20 h-20 rounded-xl bg-zinc-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-32 rounded bg-zinc-200" />
                <div className="h-4 w-12 rounded bg-zinc-200" />
              </div>
              <div className="h-3 w-4/5 rounded bg-zinc-100" />
              <div className="h-3 w-2/3 rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

