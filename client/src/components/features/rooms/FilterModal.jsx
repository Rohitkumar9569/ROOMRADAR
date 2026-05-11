// src/components/FilterModal.jsx

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

function FilterModal({ isOpen, onClose, criteria, onCriteriaChange, onApplyFilters }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop: z-index is increased from 50 to 60 */}
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10020] bg-black/60"
          />

          {/* Modal Panel: z-index is also increased from 50 to 60 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[10021] flex max-h-[88svh] flex-col rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-dark-card"
          >
            <div className="flex items-center justify-between border-b dark:border-secondary-700 pb-3 mb-4 flex-shrink-0">
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-secondary-700">
                <XMarkIcon className="h-6 w-6 dark:text-secondary-100" />
              </button>
              <h2 className="text-lg font-bold dark:text-secondary-100">Filters</h2>
              <div className="w-8"></div>
            </div>

            <div className="min-h-0 flex-grow overflow-y-auto overscroll-contain pr-1">
              <div className="mb-6">
                <h3 className="font-bold text-xl mb-2 dark:text-secondary-100">Move-in Date</h3>
                <div className="flex justify-center">
                   <DateRange
                      ranges={[{ startDate: criteria.moveInDate || new Date(), endDate: criteria.moveInDate || new Date(), key: 'selection' }]}
                      onChange={item => onCriteriaChange({ moveInDate: item.selection.startDate })}
                      minDate={new Date()}
                      direction="vertical"
                      scroll={{ enabled: true }}
                    />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-xl mb-2 dark:text-secondary-100">Search Radius</h3>
                <div className="p-4 border dark:border-secondary-700 rounded-lg dark:bg-secondary-700">
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={criteria.radius}
                      onChange={(e) => onCriteriaChange({ radius: Number(e.target.value) })}
                      className="w-full accent-cyan-500"
                    />
                    <p className="text-center mt-2 font-medium dark:text-secondary-100">{criteria.radius} km</p>
                </div>
              </div>
            </div>

            <div className="py-2 border-t dark:border-secondary-700 mt-4 flex-shrink-0">
              <button
                onClick={onApplyFilters}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Show places
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default FilterModal;
