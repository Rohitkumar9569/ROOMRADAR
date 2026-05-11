import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const Modal = ({ open, onClose, children, className = '' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-light-border bg-light-card p-5 shadow-2xl dark:border-dark-border dark:bg-dark-card sm:max-w-lg sm:rounded-2xl ${className}`}
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default Modal;
