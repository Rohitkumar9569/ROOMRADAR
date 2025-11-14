// src/components/FilterModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

function FilterModal({ isOpen, onClose, criteria, onCriteriaChange, onApplyFilters }) {
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
            className="fixed inset-0 bg-black/60 z-[60]"
          />

          {/* Modal Panel: z-index is also increased from 50 to 60 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-2xl shadow-2xl p-4 z-[60] flex flex-col"
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 flex-shrink-0">
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
                <XMarkIcon className="h-6 w-6" />
              </button>
              <h2 className="text-lg font-bold">Filters</h2>
              <div className="w-8"></div>
            </div>

            <div className="flex-grow overflow-y-auto">
              <div className="mb-6">
                <h3 className="font-bold text-xl mb-2">Move-in Date</h3>
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
                <h3 className="font-bold text-xl mb-2">Search Radius</h3>
                <div className="p-4 border rounded-lg">
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={criteria.radius}
                      onChange={(e) => onCriteriaChange({ radius: Number(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-center mt-2 font-medium">{criteria.radius} km</p>
                </div>
              </div>
            </div>

            <div className="py-2 border-t mt-4 flex-shrink-0">
              <button
                onClick={onApplyFilters}
                className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors"
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