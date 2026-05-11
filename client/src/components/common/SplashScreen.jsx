// src/components/common/SplashScreen.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react'; // Using Lucide icon for consistency

const SplashScreen = () => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg"
      // Animation for when the component is removed from the screen
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* "Radar" or "Ping" effect container */}
      <motion.div
        className="relative flex items-center justify-center"
      >
        {/* The outer pulsing ring */}
        <motion.div
          className="absolute h-24 w-24 rounded-full bg-cyan-500/25"
          animate={{
            scale: [1, 3], // Animate scale from 1x to 3x
            opacity: [1, 0], // Animate opacity from 100% to 0%
          }}
          transition={{
            repeat: Infinity, // Loop the animation forever
            duration: 2.0,    // Animation duration of 2 seconds
            ease: "easeOut",
          }}
        />
        {/* The central map pin icon */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand to-cyan-500 shadow-2xl shadow-cyan-500/25">
          <MapPin className="h-10 w-10 text-white" fill="white" />
        </div>
      </motion.div>

      {/* Brand Name */}
      <h1 className="mt-8 text-3xl font-black tracking-tight">
        <span className="text-brand">Room</span>
        <span className="text-cyan-500 dark:text-cyan-400">Radar</span>
      </h1>
    </motion.div>
  );
};

export default SplashScreen;
