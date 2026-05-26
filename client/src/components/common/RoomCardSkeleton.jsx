// src/components/common/RoomCardSkeleton.jsx

import React from 'react';

/**
 * RoomCardSkeleton - A skeleton loader for room cards
 * Supports both light and dark mode with proper shimmer animation
 */
function RoomCardSkeleton({ variant = 'default' }) {
  const SkeletonBar = ({ width, height = 'h-4', className = '' }) => (
    <div className={`skeleton-wave rounded bg-gray-200 dark:bg-gray-700 ${width} ${height} ${className}`} />
  );

  // Compact variant for list views
  if (variant === 'compact') {
    return (
      <div
        className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <div className="p-4 flex gap-4">
          {/* Thumbnail */}
          <div className="skeleton-wave relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700" />
          
          {/* Content */}
          <div className="flex-1 space-y-3">
            <SkeletonBar width="w-full" height="h-5" className="bg-gray-200 dark:bg-gray-700" />
            <SkeletonBar width="w-2/3" className="bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center justify-between pt-1">
              <SkeletonBar width="w-1/3" height="h-6" className="bg-gray-200 dark:bg-gray-700" />
              <SkeletonBar width="w-16" height="h-4" className="bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default card variant for premium room cards
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Image Section */}
      <div className="skeleton-wave relative aspect-[16/10] overflow-hidden bg-gray-200 dark:bg-gray-700 max-sm:aspect-[4/3]">
        
        {/* Badge placeholders */}
        <div className="absolute top-3 left-3 flex gap-2">
          <div className="w-16 h-6 rounded-md bg-gray-300/50 dark:bg-gray-600/50" />
        </div>
        
        {/* Heart button placeholder */}
        <div className="absolute top-3 right-3">
          <div className="w-9 h-9 rounded-full bg-white/80 dark:bg-gray-700/80" />
        </div>
        
        {/* Photo count placeholder */}
        <div className="absolute bottom-3 right-3">
          <div className="w-16 h-5 rounded-md bg-black/40 dark:bg-black/60" />
        </div>
      </div>

      {/* Content Section */}
      <div className="min-h-[12.55rem] p-4">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBar width="w-36" height="h-3.5" className="bg-gray-200 dark:bg-gray-700" />
        </div>
        <SkeletonBar width="w-10/12" height="h-5" className="mt-3 bg-gray-200 dark:bg-gray-700" />
        <SkeletonBar width="w-9/12" height="h-5" className="mt-1.5 bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <SkeletonBar width="w-full" height="h-6" className="rounded-full bg-gray-200 dark:bg-gray-700" />
          <SkeletonBar width="w-full" height="h-6" className="rounded-full bg-gray-200 dark:bg-gray-700" />
          <SkeletonBar width="w-7/12" height="h-6" className="rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <SkeletonBar width="w-full" height="h-6" className="mt-1.5 rounded-xl bg-gray-200 dark:bg-gray-700" />

        <div className="mt-2.5 flex items-baseline justify-between gap-2 rounded-2xl bg-gray-100 p-2 dark:bg-gray-700/60">
          <SkeletonBar width="w-24" height="h-6" className="bg-gray-200 dark:bg-gray-700" />
          <SkeletonBar width="w-10" height="h-3" className="bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

export default RoomCardSkeleton;
