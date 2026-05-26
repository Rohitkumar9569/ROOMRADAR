// Premium Landlord Calendar - Airbnb/Calendly/Notion Inspired Design
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CalendarDaysIcon,
  HomeIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckSolidIcon,
  XCircleIcon as XSolidIcon
} from '@heroicons/react/24/solid';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';

const getBookingKey = (booking) => booking._id || booking.id || booking.applicationId;
const getBookingStartValue = (booking) => booking.checkInDate || booking.start;
const getBookingEndValue = (booking) => booking.checkOutDate || booking.end;
const parseBookingDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const PremiumLandlordCalendar = ({ bookings = [], highlightThisWeek = false, onEventClick, onApprove, onReject }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDrawer, setShowEventDrawer] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Calculate calendar dates
  const calendarDays = useMemo(() => {
    const monthStart = viewMode === 'week' ? startOfWeek(currentDate) : startOfMonth(currentDate);
    const monthEnd = viewMode === 'week' ? endOfWeek(currentDate) : endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = [];
    let day = startDate;
    
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    return days;
  }, [currentDate, viewMode]);

  // Filter bookings by date
  const getBookingsForDay = useCallback((day) => {
    return bookings.filter(booking => {
      const bookingDate = parseBookingDate(getBookingStartValue(booking));
      if (!bookingDate) return false;
      return isSameDay(bookingDate, day);
    });
  }, [bookings]);

  // Navigation functions
  const navigateMonth = useCallback((direction) => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  }, []);

  const handleEventClick = useCallback((event, day) => {
    setSelectedEvent({ ...event, day });
    setShowEventDrawer(true);
  }, [onEventClick]);

  const handleCellClick = useCallback((day) => {
    const dayBookings = getBookingsForDay(day);
    if (dayBookings.length > 0) {
      setSelectedDay({ date: day, bookings: dayBookings });
    }
  }, [getBookingsForDay]);

  const isWithinHighlightedWeek = useCallback((day) => {
    if (!highlightThisWeek) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = addDays(today, 7);
    weekEnd.setHours(23, 59, 59, 999);
    return day >= today && day <= weekEnd;
  }, [highlightThisWeek]);

  const handleApprove = useCallback(async () => {
    if (selectedEvent && onApprove) {
      await onApprove(getBookingKey(selectedEvent));
      setShowEventDrawer(false);
      setSelectedEvent(null);
    }
  }, [selectedEvent, onApprove]);

  const handleReject = useCallback(async () => {
    if (selectedEvent && onReject) {
      await onReject(getBookingKey(selectedEvent));
      setShowEventDrawer(false);
      setSelectedEvent(null);
    }
  }, [selectedEvent, onReject]);

  // Event status configuration
  const eventStatusConfig = {
    pending: {
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      icon: ExclamationCircleIcon,
      label: 'Pending'
    },
    approved: {
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      icon: CheckCircleIcon,
      label: 'Approved'
    },
    rejected: {
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      icon: XCircleIcon,
      label: 'Rejected'
    },
    confirmed: {
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      icon: CheckCircleIcon,
      label: 'Confirmed'
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-light-border bg-light-card shadow-sm dark:border-dark-border dark:bg-dark-card">
      {/* Calendar Header */}
      <div className="border-b border-light-border bg-light-card px-4 py-4 dark:border-dark-border dark:bg-dark-card sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="rounded-xl p-2 text-light-muted transition-colors hover:bg-light-bg hover:text-light-text dark:text-dark-muted dark:hover:bg-dark-input dark:hover:text-dark-text"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
            
            <button
              onClick={() => navigateMonth('next')}
              className="rounded-xl p-2 text-light-muted transition-colors hover:bg-light-bg hover:text-light-text dark:text-dark-muted dark:hover:bg-dark-input dark:hover:text-dark-text"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-light-border bg-light-bg p-1 dark:border-dark-border dark:bg-dark-input">
            <button
              onClick={() => setViewMode('month')}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                viewMode === 'month' 
                  ? 'bg-brand text-white shadow-sm' 
                  : 'text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text'
              }`}
            >
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                viewMode === 'week' 
                  ? 'bg-brand text-white shadow-sm' 
                  : 'text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text'
              }`}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-light-card p-3 dark:bg-dark-card sm:p-6">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div key={index} className="py-2 text-center text-sm font-semibold text-light-muted dark:text-dark-muted">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, dayIndex) => {
            const dayBookings = getBookingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const isWeekHighlighted = isWithinHighlightedWeek(day);
            
            return (
              <div
                key={dayIndex}
                onClick={() => handleCellClick(day)}
                className={`
                  min-h-[72px] cursor-pointer rounded-xl border p-1.5 transition-all sm:min-h-[100px] sm:p-2
                  ${!isCurrentMonth ? 'border-light-border bg-light-bg/70 dark:border-dark-border dark:bg-dark-bg/70' : 'border-light-border bg-light-card dark:border-dark-border dark:bg-dark-card'}
                  ${isCurrentDay ? 'border-brand ring-2 ring-brand' : ''}
                  ${isWeekHighlighted ? 'ring-2 ring-sky-400/70' : ''}
                  hover:bg-light-bg hover:shadow-sm dark:hover:bg-dark-input/60
                `}
              >
                {/* Day Number */}
                <div className={`
                  text-sm font-medium mb-2
                  ${!isCurrentMonth ? 'text-light-muted/60 dark:text-dark-muted/60' : 'text-light-text dark:text-dark-text'}
                  ${isCurrentDay ? 'inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white font-bold' : ''}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayBookings.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 md:hidden">
                      {dayBookings.slice(0, 4).map((booking) => {
                        const dotColor = {
                          pending: 'bg-amber-500',
                          approved: 'bg-emerald-500',
                          confirmed: 'bg-sky-500',
                          rejected: 'bg-rose-500'
                        }[booking.status] || 'bg-brand';
                        return <span key={getBookingKey(booking)} className={`h-2 w-2 rounded-full ${dotColor}`} />;
                      })}
                    </div>
                  )}
                  {dayBookings.slice(0, 3).map((booking, index) => {
                    const config = eventStatusConfig[booking.status] || eventStatusConfig.pending;
                    const StatusIcon = config.icon;
                    
                    return (
                      <motion.div
                        key={getBookingKey(booking)}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEventClick(booking, day);
                        }}
                        className={`
                          ${config.bgColor} ${config.borderColor} ${config.textColor}
                          rounded-lg border px-2 py-1 text-xs
                          hidden items-center gap-1 hover:shadow-sm transition-all md:flex
                          dark:border-white/10 dark:bg-opacity-15
                        `}
                      >
                        <StatusIcon className="h-3 w-3 flex-shrink-0" />
                        <div className="flex-1 truncate">
                          <div className="font-medium truncate">{booking.room?.title || 'Room'}</div>
                          <div className="opacity-75">{booking.student?.name || 'Applicant'}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {dayBookings.length > 3 && (
                    <div className="hidden py-1 text-center text-xs text-light-muted dark:text-dark-muted md:block">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Side Drawer */}
      <AnimatePresence>
        {showEventDrawer && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end"
            onClick={() => setShowEventDrawer(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="h-full w-full max-w-md overflow-y-auto bg-light-card shadow-2xl dark:bg-dark-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="sticky top-0 z-10 border-b border-light-border bg-light-card px-6 py-4 dark:border-dark-border dark:bg-dark-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Booking Details</h3>
                  <button
                    onClick={() => setShowEventDrawer(false)}
                    className="rounded-xl p-2 text-light-muted transition-colors hover:bg-light-bg hover:text-light-text dark:text-dark-muted dark:hover:bg-dark-input dark:hover:text-dark-text"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  {(() => {
                    const config = eventStatusConfig[selectedEvent.status] || eventStatusConfig.pending;
                    return (
                      <div className={`${config.bgColor} ${config.borderColor} ${config.textColor} flex items-center gap-2 rounded-full border px-4 py-2 font-medium`}>
                        {React.createElement(config.icon, { className: 'h-5 w-5' })}
                        {config.label}
                      </div>
                    );
                  })()}
                </div>

                {/* Room Info */}
                <div className="rounded-2xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-sidebar">
                  <h4 className="mb-2 font-medium text-light-text dark:text-dark-text">Room Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <HomeIcon className="h-4 w-4 text-light-muted dark:text-dark-muted" />
                      <span className="text-sm text-light-muted dark:text-dark-muted">{selectedEvent.room?.title || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-light-muted dark:text-dark-muted" />
                      <span className="text-sm text-light-muted dark:text-dark-muted">
                        {parseBookingDate(getBookingStartValue(selectedEvent)) ? format(parseBookingDate(getBookingStartValue(selectedEvent)), 'MMM dd, yyyy') : 'N/A'}
                        {parseBookingDate(getBookingEndValue(selectedEvent)) ? ` - ${format(parseBookingDate(getBookingEndValue(selectedEvent)), 'MMM dd, yyyy')}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-light-muted dark:text-dark-muted" />
                      <span className="text-sm text-light-muted dark:text-dark-muted">Check-in: 12:00 PM</span>
                    </div>
                  </div>
                </div>

                {/* Tenant Info */}
                <div className="rounded-2xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-sidebar">
                  <h4 className="mb-2 font-medium text-light-text dark:text-dark-text">Tenant Information</h4>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-light-border dark:bg-dark-input">
                      <UserIcon className="h-8 w-8 text-light-muted dark:text-dark-muted" />
                    </div>
                    <div>
                      <div className="font-medium text-light-text dark:text-dark-text">{selectedEvent.student?.name || 'N/A'}</div>
                      <div className="text-sm text-light-muted dark:text-dark-muted">{selectedEvent.student?.email || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-light-muted dark:text-dark-muted" />
                      <span className="text-sm text-light-muted dark:text-dark-muted">{selectedEvent.student?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="h-4 w-4 text-light-muted dark:text-dark-muted" />
                      <span className="text-sm text-light-muted dark:text-dark-muted">{selectedEvent.student?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                {selectedEvent.message && (
                  <div className="rounded-2xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-sidebar">
                    <h4 className="mb-2 font-medium text-light-text dark:text-dark-text">Message</h4>
                    <p className="text-sm text-light-muted dark:text-dark-muted">{selectedEvent.message}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedEvent.status === 'pending' && (
                  <div className="space-y-3 border-t border-light-border pt-4 dark:border-dark-border">
                    <button
                      onClick={handleApprove}
                      className="rr-approve-action flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-3 font-medium text-white transition-colors hover:bg-green-600"
                    >
                      <CheckSolidIcon className="h-5 w-5" />
                      Approve Booking
                    </button>
                    <button
                      onClick={handleReject}
                      className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <XSolidIcon className="h-5 w-5" />
                      Reject Booking
                    </button>
                  </div>
                )}

                {/* Contact Info */}
                <div className="border-t border-light-border pt-4 dark:border-dark-border">
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 rounded-xl bg-light-bg px-4 py-2 text-light-text transition-colors hover:bg-light-border dark:bg-dark-input dark:text-dark-text dark:hover:bg-dark-border">
                      <PhoneIcon className="h-4 w-4" />
                      Call
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-xl bg-light-bg px-4 py-2 text-light-text transition-colors hover:bg-light-border dark:bg-dark-input dark:text-dark-text dark:hover:bg-dark-border">
                      <EnvelopeIcon className="h-4 w-4" />
                      Email
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDay && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end bg-black/45 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              className="max-h-[72vh] w-full overflow-y-auto rounded-t-3xl border border-light-border bg-light-card p-5 shadow-2xl dark:border-dark-border dark:bg-dark-card"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-light-border dark:bg-dark-border" />
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Day bookings</p>
                  <h3 className="text-xl font-black text-light-text dark:text-dark-text">{format(selectedDay.date, 'dd MMM yyyy')}</h3>
                </div>
                <button type="button" onClick={() => setSelectedDay(null)} className="rounded-full p-2 text-light-muted hover:bg-light-bg dark:text-dark-muted dark:hover:bg-dark-input">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                {selectedDay.bookings.map((booking) => {
                  const config = eventStatusConfig[booking.status] || eventStatusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <button
                      key={getBookingKey(booking)}
                      type="button"
                      onClick={() => {
                        setSelectedDay(null);
                        handleEventClick(booking, selectedDay.date);
                      }}
                      className="w-full rounded-2xl border border-light-border bg-light-bg p-4 text-left dark:border-dark-border dark:bg-dark-sidebar"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-light-text dark:text-dark-text">{booking.room?.title || 'Room'}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-light-muted dark:text-dark-muted">{booking.student?.name || 'Applicant'}</p>
                        </div>
                        <span className={`${config.bgColor} ${config.textColor} inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PremiumLandlordCalendar;
