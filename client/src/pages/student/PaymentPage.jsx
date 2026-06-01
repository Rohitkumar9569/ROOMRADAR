import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    BadgeCheck,
    Banknote,
    CheckCircle2,
    CreditCard,
    Home,
    Landmark,
    LockKeyhole,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';
import api, { confirmPayment } from '../../api';
import Spinner from '../../components/common/Spinner';
import BookingStatusTimeline from '../../components/features/booking/BookingStatusTimeline';
import fallbackRoomImage from '../../assets/background_img.jpg';
import { useSettings } from '../../context/SettingsContext';
import { formatListingTitle } from '../../utils/listingDisplay';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;
const parseMoneyValue = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const numericValue = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : undefined;
};

const buildBreakdown = (application, settings) => {
    if (application?.amountBreakdown?.total) return application.amountBreakdown;

    const rent = Number(application?.room?.rent || 0);
    const rawDeposit = application?.room?.securityDeposit;
    const securityDeposit = parseMoneyValue(rawDeposit) ?? rent;
    const platformFee = Number(settings?.platformFee || 0);

    return {
        rent,
        securityDeposit,
        platformFee,
        total: rent + securityDeposit + platformFee,
    };
};

const methodOptions = [
    { id: 'upi', label: 'UPI', description: 'Instant confirmation', Icon: Smartphone },
    { id: 'card', label: 'Card', description: 'Credit or debit card', Icon: CreditCard },
    { id: 'netbanking', label: 'Net banking', description: 'Bank transfer rails', Icon: Landmark },
];

const roomAllowsOfflinePayment = (room = {}) => {
    const preference = String(room.paymentPreference || '').toLowerCase();
    return Boolean(
        room.offlinePaymentAllowed ||
        preference.includes('offline') ||
        preference.includes('cash') ||
        preference.includes('upi') ||
        preference.includes('bank transfer')
    );
};

const PaymentPage = () => {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('upi');

    useEffect(() => {
        const fetchApplication = async () => {
            try {
                const { data } = await api.get(`/applications/${applicationId}`);
                setApplication(data);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Could not load booking details.');
                navigate('/profile/my-applications');
            } finally {
                setLoading(false);
            }
        };

        fetchApplication();
    }, [applicationId, navigate]);

    const breakdown = useMemo(() => buildBreakdown(application, settings), [application, settings]);

    const handleConfirm = async () => {
        if (!application || processing) return;

        if (application.status === 'confirmed') {
            navigate(`/profile/agreement/${application._id}`);
            return;
        }

        if (application.status !== 'approved') {
            toast.error('Landlord approval is required before final confirmation.');
            return;
        }

        setProcessing(true);
        const toastId = toast.loading('Securing your booking...');

        try {
            const { data } = await confirmPayment(application._id, { paymentMethod });
            setApplication((prev) => ({ ...prev, ...data.application, status: 'confirmed' }));
            toast.success('Booking confirmed on both sides.', { id: toastId });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not confirm booking.', { id: toastId });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!application) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center text-center text-rose-600">
                Booking details not found.
            </div>
        );
    }

    const room = application.room || {};
    const displayTitle = formatListingTitle(room.title, 'Room listing');
    const heroImage = room.images?.[0]?.url || room.images?.[0] || room.imageUrl || fallbackRoomImage;
    const isApproved = application.status === 'approved';
    const isConfirmed = application.status === 'confirmed';
    const offlineAllowed = Boolean(settings?.offlinePaymentAllowed !== false && roomAllowsOfflinePayment(room));
    const availablePaymentMethods = offlineAllowed
        ? [...methodOptions, { id: 'cash', label: 'Offline', description: 'Pay host on move-in', Icon: Banknote }]
        : methodOptions;
    const isOfflineMethod = paymentMethod === 'cash';
    const stayDates = [
        application.checkInDate ? format(new Date(application.checkInDate), 'dd MMM yyyy') : null,
        application.checkOutDate ? format(new Date(application.checkOutDate), 'dd MMM yyyy') : null,
    ].filter(Boolean).join(' - ');

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-secondary-900 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <Link
                    to="/profile/my-applications"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-200"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Room requests
                </Link>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-secondary-700 dark:bg-secondary-800 dark:shadow-black/20">
                        <div className="relative h-72 sm:h-96">
                            <img src={heroImage} alt={displayTitle} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm backdrop-blur">
                                    <BadgeCheck className="h-4 w-4" />
                                    Host approved booking
                                </div>
                                <h1 className="max-w-2xl text-3xl font-black text-white sm:text-4xl">{displayTitle}</h1>
                                <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">
                                    {room.location?.fullAddress || [room.location?.city, room.location?.state].filter(Boolean).join(', ')}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
                                <p className="text-xs font-black uppercase text-slate-500">Stay dates</p>
                                <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{stayDates || 'Not set'}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
                                <p className="text-xs font-black uppercase text-slate-500">Room seeker</p>
                                <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{application.fullName}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
                                <p className="text-xs font-black uppercase text-slate-500">Host</p>
                                <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{application.landlord?.name || 'Landlord'}</p>
                            </div>
                        </div>
                    </section>

                    <aside className="space-y-5">
                        <BookingStatusTimeline status={application.status} />

                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-secondary-700 dark:bg-secondary-800 dark:shadow-black/20 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">Secure confirmation</p>
                                    <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                                        {isConfirmed ? 'Your room is locked' : 'Confirm and lock this room'}
                                    </h2>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-200">
                                    {isConfirmed ? <CheckCircle2 className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
                                </div>
                            </div>

                            <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 dark:text-secondary-300">First month rent</span>
                                    <span className="font-black text-slate-900 dark:text-white">{money(breakdown.rent)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 dark:text-secondary-300">Security deposit</span>
                                    <span className="font-black text-slate-900 dark:text-white">{money(breakdown.securityDeposit)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 dark:text-secondary-300">Booking protection</span>
                                    <span className="font-black text-slate-900 dark:text-white">{money(breakdown.platformFee)}</span>
                                </div>
                                <div className="border-t border-slate-200 pt-3 dark:border-secondary-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-black text-slate-950 dark:text-white">
                                            {isOfflineMethod ? 'Total to settle' : 'Total today'}
                                        </span>
                                        <span className="text-2xl font-black text-cyan-600 dark:text-cyan-300">{money(breakdown.total)}</span>
                                    </div>
                                </div>
                            </div>

                            {!isConfirmed && (
                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    {availablePaymentMethods.map(({ id, label, description, Icon }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setPaymentMethod(id)}
                                            className={`rounded-2xl border p-4 text-left transition ${
                                                paymentMethod === id
                                                    ? 'border-cyan-300 bg-cyan-50 shadow-sm dark:border-cyan-500/40 dark:bg-cyan-500/15'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-secondary-700 dark:bg-secondary-800'
                                            }`}
                                        >
                                            <Icon className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                                            <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">{label}</p>
                                            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-secondary-400">{description}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isOfflineMethod && (
                                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                                    Offline payment will confirm the booking inside RoomRadar, but rent/deposit collection is settled directly with the host. Keep receipts or UPI proof in chat for safety.
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={processing || (!isApproved && !isConfirmed)}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-200"
                            >
                                {processing ? (
                                    <>
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-slate-950/30 dark:border-t-slate-950" />
                                        Confirming
                                    </>
                                ) : isConfirmed ? (
                                    <>
                                        <Home className="h-5 w-5" />
                                        View agreement
                                    </>
                                ) : isOfflineMethod ? (
                                    <>
                                        <Banknote className="h-5 w-5" />
                                        Confirm offline booking
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="h-5 w-5" />
                                        Confirm booking
                                    </>
                                )}
                            </button>

                            {!isApproved && !isConfirmed && (
                                <p className="mt-3 text-center text-xs font-semibold text-amber-600 dark:text-amber-300">
                                    This action unlocks after landlord approval.
                                </p>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
