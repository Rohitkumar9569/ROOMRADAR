// src/components/FilterModal.jsx

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const moveInFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', day: '2-digit', year: 'numeric' });
const formatMoveInDate = (date) => (date ? moveInFormatter.format(date) : 'Any time');

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
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10020] bg-black/60"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[10021] flex max-h-[88svh] flex-col rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-dark-card"
          >
            <div className="mb-4 flex flex-shrink-0 items-center justify-between border-b border-light-border pb-3 dark:border-dark-border">
              <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-dark-input" aria-label="Close filters">
                <XMarkIcon className="h-6 w-6 dark:text-secondary-100" />
              </button>
              <h2 className="text-lg font-black dark:text-secondary-100">Filters</h2>
              <div className="w-8"></div>
            </div>

            <div className="min-h-0 flex-grow space-y-4 overflow-y-auto overscroll-contain pr-1">
              <div className="rounded-2xl border border-light-border bg-light-bg p-3 dark:border-dark-border dark:bg-dark-input">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-black dark:text-secondary-100">Move-in</h3>
                    <p className="mt-0.5 truncate text-sm font-semibold text-light-muted dark:text-dark-muted">{formatMoveInDate(criteria.moveInDate)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCriteriaChange({ moveInDate: null })}
                    className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                      criteria.moveInDate
                        ? 'bg-white text-light-muted hover:text-light-text dark:bg-dark-card dark:text-dark-muted dark:hover:text-dark-text'
                        : 'bg-cyan-600 text-white'
                    }`}
                  >
                    Any time
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <DateRange
                    ranges={[{ startDate: criteria.moveInDate || new Date(), endDate: criteria.moveInDate || new Date(), key: 'selection' }]}
                    onChange={item => onCriteriaChange({ moveInDate: item.selection.startDate })}
                    minDate={new Date()}
                    direction="vertical"
                    scroll={{ enabled: true }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-light-border bg-light-bg p-3 dark:border-dark-border dark:bg-dark-input">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-black dark:text-secondary-100">Search radius</h3>
                  <span className="rounded-full bg-cyan-600 px-3 py-1 text-xs font-black text-white">{criteria.radius} km</span>
                </div>
                <div>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={criteria.radius}
                      onChange={(e) => onCriteriaChange({ radius: Number(e.target.value) })}
                      className="w-full accent-cyan-500"
                    />
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[2, 5, 10, 20].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onCriteriaChange({ radius: value })}
                          className={`rounded-full px-2 py-2 text-xs font-black ${
                            Number(criteria.radius) === value
                              ? 'bg-cyan-600 text-white'
                              : 'bg-white text-light-muted dark:bg-dark-card dark:text-dark-muted'
                          }`}
                        >
                          {value} km
                        </button>
                      ))}
                    </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex-shrink-0 border-t border-light-border py-2 dark:border-dark-border">
              <button
                onClick={onApplyFilters}
                className="w-full rounded-2xl bg-red-500 py-3 font-black text-white transition-colors hover:bg-red-600"
              >
                Apply filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default FilterModal;
