// src/components/common/RoomCardSkeleton.jsx

import React from 'react';

function RoomCardSkeleton() {
  return (
    // 1. The main container is now the relative parent for the shimmer
    <div className="relative overflow-hidden rounded-xl">
      
      {/* 2. This is the static, non-pulsing skeleton structure */}
      <div className="space-y-3">
        {/* Image Placeholder */}
        <div className="aspect-square w-full rounded-xl bg-neutral-300"></div>
        
        {/* Text Placeholders */}
        <div className="pt-1 space-y-2">
          <div className="h-4 bg-neutral-300 rounded w-3/4"></div>
          <div className="h-4 bg-neutral-300 rounded w-1/2"></div>
          <div className="h-4 bg-neutral-300 rounded w-1/3"></div>
        </div>
      </div>

      {/* 3. This is the shimmer overlay that animates on top */}
      <div className="shimmer-overlay"></div>
      
    </div>
  );
}

export default RoomCardSkeleton;