import React from 'react';

const SkeletonBlock = ({ className = '' }) => (
  <span className={`skeleton-wave block rounded bg-light-border dark:bg-dark-input ${className}`} />
);

function ListingCardSkeleton() {
  return (
    <article className="rr-listing-card-pro h-full">
      <SkeletonBlock className="aspect-[1/0.78] w-full rounded-none" />
      <div className="rr-listing-card-body">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-4/5" />
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="h-3 w-3/4" />
        </div>
        <div className="rr-listing-metrics">
          <SkeletonBlock className="h-11 w-full rounded-xl" />
          <SkeletonBlock className="h-11 w-full rounded-xl" />
        </div>
        <SkeletonBlock className="h-11 w-full rounded-xl" />
      </div>
    </article>
  );
}

export default ListingCardSkeleton;
