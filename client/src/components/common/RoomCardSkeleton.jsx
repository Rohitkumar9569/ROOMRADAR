// src/components/common/RoomCardSkeleton.jsx

import React from 'react';
import { motion } from 'framer-motion';

/**
 * RoomCardSkeleton - A skeleton loader for room cards
 * Supports both light and dark mode with proper shimmer animation
 */
function RoomCardSkeleton({ variant = 'default' }) {
  // Card container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  // Shimmer animation for skeleton bars
  const shimmerVariants = {
    initial: { x: '-100%' },
    animate: { 
      x: '100%',
      transition: { 
        repeat: Infinity, 
        duration: 1.5, 
        ease: 'linear',
        repeatDelay: 0.5
      }
    }
  };

  // Skeleton bar component with shimmer
  const SkeletonBar = ({ width, height = 'h-4', className = '' }) => (
    <div className={`relative overflow-hidden rounded ${height} ${className}`}>
      {/* Base background - light mode: gray-200, dark mode: gray-700 */}
      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
      
      {/* Shimmer overlay */}
      <motion.div
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        className={`absolute inset-0 ${width}`}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
        }}
      />
      
      {/* Dark mode shimmer - subtle white glow */}
      <div className="absolute inset-0 opacity-0 dark:opacity-100">
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className={`absolute inset-0 ${width}`}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          }}
        />
      </div>
    </div>
  );

  // Compact variant for list views
  if (variant === 'compact') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <div className="p-4 flex gap-4">
          {/* Thumbnail */}
          <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
            <motion.div
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              }}
            />
          </div>
          
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
      </motion.div>
    );
  }

  // Default card variant for premium room cards
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* Base background */}
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
        
        {/* Image shimmer */}
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
        />
        
        {/* Dark mode shimmer overlay */}
        <div className="absolute inset-0 opacity-0 dark:opacity-100">
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            }}
          />
        </div>
        
        {/* Badge placeholders */}
        <div className="absolute top-3 left-3 flex gap-2">
          <div className="w-16 h-6 rounded-md bg-gray-300/50 dark:bg-gray-600/50 backdrop-blur-sm" />
        </div>
        
        {/* Heart button placeholder */}
        <div className="absolute top-3 right-3">
          <div className="w-9 h-9 rounded-full bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm" />
        </div>
        
        {/* Photo count placeholder */}
        <div className="absolute bottom-3 right-3">
          <div className="w-16 h-5 rounded-md bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Location row */}
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-gray-700" />
          <SkeletonBar width="w-2/3" height="h-3.5" className="bg-gray-200 dark:bg-gray-700" />
        </div>
        
        {/* Title */}
        <SkeletonBar width="w-11/12" height="h-5" className="bg-gray-200 dark:bg-gray-700" />
        
        {/* Room type & furnished row */}
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-gray-700" />
          <SkeletonBar width="w-1/3" height="h-3.5" className="bg-gray-200 dark:bg-gray-700" />
        </div>
        
        {/* Rating row */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
          <div className="ml-1 w-16 h-4 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-700" />
        
        {/* Price and response rate row */}
        <div className="flex items-center justify-between pt-1">
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <SkeletonBar width="w-20" height="h-6" className="bg-gray-200 dark:bg-gray-700" />
              <SkeletonBar width="w-12" height="h-3" className="bg-gray-200 dark:bg-gray-700" />
            </div>
            <SkeletonBar width="w-16" height="h-3" className="bg-gray-200 dark:bg-gray-700" />
          </div>
          <SkeletonBar width="w-20" height="h-4" className="bg-gray-200 dark:bg-gray-700" />
        </div>
        
        {/* Tags row */}
        <div className="flex gap-2 pt-1">
          <div className="w-20 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </motion.div>
  );
}

export default RoomCardSkeleton;
