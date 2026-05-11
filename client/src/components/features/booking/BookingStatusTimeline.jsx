import React from 'react';
import { CheckCircle2, Circle, Clock3, XCircle } from 'lucide-react';

const STEPS = [
    { key: 'request', label: 'Request sent' },
    { key: 'approval', label: 'Host approval' },
    { key: 'confirmation', label: 'Tenant confirm' },
    { key: 'booked', label: 'Room booked' },
];

const STATUS_COPY = {
    pending: {
        title: 'Waiting for host approval',
        description: 'Your request is with the landlord. Chat remains open for visit timing and questions.',
        activeIndex: 1,
    },
    approved: {
        title: 'Host approved your request',
        description: 'Confirm the booking to lock the room and move to agreement details.',
        activeIndex: 2,
    },
    confirmed: {
        title: 'Booking confirmed',
        description: 'Both sides are confirmed. Agreement and move-in details are ready.',
        activeIndex: 3,
    },
    rejected: {
        title: 'Request declined',
        description: 'This request is closed. You can continue exploring other premium rooms.',
        activeIndex: 1,
        terminal: 'rejected',
    },
    cancelled: {
        title: 'Request cancelled',
        description: 'This request has been cancelled and no longer needs action.',
        activeIndex: 1,
        terminal: 'cancelled',
    },
};

const normalizeStatus = (status) => (status || 'pending').toLowerCase();

const BookingStatusTimeline = ({ status = 'pending', compact = false, className = '' }) => {
    const statusKey = normalizeStatus(status);
    const meta = STATUS_COPY[statusKey] || STATUS_COPY.pending;

    return (
        <div className={`rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-secondary-700 dark:bg-secondary-800/90 ${className}`}>
            {!compact && (
                <div className="mb-4">
                    <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">Booking journey</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{meta.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-secondary-300">{meta.description}</p>
                </div>
            )}

            <div className="grid grid-cols-4 gap-2">
                {STEPS.map((step, index) => {
                    const isPast = statusKey === 'confirmed' || index < meta.activeIndex;
                    const isActive = index === meta.activeIndex && !meta.terminal && statusKey !== 'confirmed';
                    const isTerminal = meta.terminal && index === meta.activeIndex;
                    const Icon = isTerminal ? XCircle : isPast ? CheckCircle2 : isActive ? Clock3 : Circle;

                    return (
                        <div key={step.key} className="min-w-0">
                            <div className="flex items-center">
                                <span
                                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${
                                        isTerminal
                                            ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200'
                                            : isPast
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200'
                                                : isActive
                                                    ? 'border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-200'
                                                    : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-secondary-700 dark:bg-secondary-900 dark:text-secondary-500'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                {index < STEPS.length - 1 && (
                                    <span
                                        className={`mx-1 h-0.5 min-w-0 flex-1 rounded-full ${
                                            isPast ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-secondary-700'
                                        }`}
                                    />
                                )}
                            </div>
                            <p className={`mt-2 truncate text-[11px] font-black ${isPast || isActive || isTerminal ? 'text-slate-800 dark:text-secondary-100' : 'text-slate-400 dark:text-secondary-500'}`}>
                                {step.label}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BookingStatusTimeline;
