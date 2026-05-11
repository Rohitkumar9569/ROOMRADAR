import React from 'react';
import { motion } from 'framer-motion';
import { Radar } from 'lucide-react';

const AppLoader = () => {
  return (
    <motion.div
      className="app-loader-premium fixed inset-0 z-[99999] flex flex-col items-center justify-center text-light-text dark:text-dark-text"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.34, ease: 'easeOut' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="app-loader-card"
      >
        <div className="app-loader-logo">
          <motion.span
            className="app-loader-pulse"
            animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
          <Radar className="h-9 w-9" />
        </div>
        <div className="min-w-0">
          <motion.p
            className="app-loader-kicker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.28 }}
          >
            RoomRadar
          </motion.p>
          <motion.h1
            className="app-loader-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16, duration: 0.32 }}
          >
            Loading your stay flow
          </motion.h1>
        </div>
      </motion.div>

      <div className="app-loader-progress">
        <motion.div
          className="h-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
};

export default AppLoader;
