import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, CheckCircle2, MessageCircle, ShieldCheck, Sparkles, Users } from 'lucide-react';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

const BookingPanel = ({ room, onContactLandlord }) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const rentPerMonth = Number(room.rent || 0);
    const securityDeposit = Number(String(room.securityDeposit || '').replace(/[^\d.]/g, '')) || rentPerMonth;
    const discount = room.originalRent ? Math.round(((room.originalRent - room.rent) / room.originalRent) * 100) : 0;
    const isBooked = ['Booked', 'Confirmed'].includes(room.status);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 dark:border-secondary-700 dark:bg-secondary-800 dark:shadow-black/30"
            >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-amber-300 to-rose-400" />

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase text-slate-500 dark:text-secondary-400">Monthly rent</p>
                        <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{money(rentPerMonth)}</p>
                    </div>
                    {discount > 0 && (
                        <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20">
                            {discount}% off
                        </span>
                    )}
                </div>

                <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-600 dark:text-cyan-300" />
                        <div>
                            <p className="text-sm font-black text-cyan-900 dark:text-cyan-100">Two-side confirmation</p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-cyan-700 dark:text-cyan-200">
                                Request first, get landlord approval, then confirm to lock the room.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
                        <CalendarDays className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                        <p className="mt-3 text-xs font-black uppercase text-slate-500">Move-in</p>
                        <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">Flexible</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
                        <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                        <p className="mt-3 text-xs font-black uppercase text-slate-500">Capacity</p>
                        <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{room.beds || 1} bed{Number(room.beds || 1) > 1 ? 's' : ''}</p>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-500 dark:text-secondary-300">Security deposit</span>
                        <span className="font-black text-slate-950 dark:text-white">{money(securityDeposit)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-500 dark:text-secondary-300">Platform protection</span>
                        <span className="font-black text-slate-950 dark:text-white">Included</span>
                    </div>
                </div>

                <motion.button
                    type="button"
                    onClick={() => navigate(`/room/${room._id}/book`)}
                    disabled={isBooked}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    whileHover={!isBooked ? { scale: 1.015 } : {}}
                    whileTap={!isBooked ? { scale: 0.985 } : {}}
                    className="group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-200"
                >
                    <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: isHovered ? 260 : -260 }}
                        transition={{ duration: 0.6 }}
                    />
                    <Sparkles className="relative h-5 w-5" />
                    <span className="relative">{isBooked ? 'Already booked' : 'Request to book'}</span>
                    <ArrowRight className="relative h-5 w-5 transition group-hover:translate-x-1" />
                </motion.button>

                <button
                    type="button"
                    onClick={onContactLandlord}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-cyan-500/10"
                >
                    <MessageCircle className="h-5 w-5" />
                    Contact landlord
                </button>

                <div className="mt-5 flex items-center justify-center gap-4 text-xs font-bold text-slate-500 dark:text-secondary-400">
                    <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        No charge to request
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>Chat enabled</span>
                </div>
            </motion.div>
        </>
    );
};

export default BookingPanel;
