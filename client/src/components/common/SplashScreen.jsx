// src/components/common/SplashScreen.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react'; // Using Lucide icon for consistency

const SplashScreen = () => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
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
          className="absolute h-24 w-24 rounded-full bg-red-500/30"
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
        <div className="relative h-20 w-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
          <MapPin className="h-10 w-10 text-white" fill="white" />
        </div>
      </motion.div>

      {/* Brand Name */}
      <h1 className="text-3xl font-bold text-red-500 mt-8">
        RoomRadar
      </h1>
    </motion.div>
  );
};

export default SplashScreen;