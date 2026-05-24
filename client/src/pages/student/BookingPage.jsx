import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    FileBadge2,
    Home,
    IdCard,
    Loader2,
    ShieldCheck,
    UploadCloud,
    UserRound,
    Users
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';
import fallbackRoomImage from '../../assets/background_img.jpg';
import { isValidIndianMobile, phoneInputProps, sanitizePhoneInput } from '../../utils/phoneUtils';
import { formatListingTitle } from '../../utils/listingDisplay';
import { trackUsageEvent } from '../../utils/usageAnalytics';

const durations = [
    { label: '1M', months: 1 },
    { label: '3M', months: 3 },
    { label: '6M', months: 6 },
    { label: '12M', months: 12 }
];

const steps = ['Stay', 'Details', 'Review', 'Sent'];

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

const toDateInputValue = (date) => {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().split('T')[0];
};

const addMonths = (dateString, months) => {
    const date = new Date(dateString);
    date.setMonth(date.getMonth() + Number(months || 1));
    return toDateInputValue(date);
};

const getImage = (room) => room?.images?.[0]?.url || room?.images?.[0] || room?.imageUrl || fallbackRoomImage;

const BookingPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [idProofFile, setIdProofFile] = useState(null);

    const tomorrow = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        return toDateInputValue(date);
    }, []);

    const [form, setForm] = useState({
        moveInDate: tomorrow,
        durationMonths: 3,
        occupants: 1,
        fullName: user?.name || '',
        mobileNumber: sanitizePhoneInput(user?.mobileNumber || user?.phone || ''),
        purposeOfStay: 'Travelling',
        idProofType: 'Aadhaar Card',
        emergencyName: '',
        emergencyPhone: '',
        message: '',
        agreedToTerms: false
    });

    useEffect(() => {
        setForm((current) => ({
            ...current,
            fullName: current.fullName || user?.name || '',
            mobileNumber: current.mobileNumber || sanitizePhoneInput(user?.mobileNumber || user?.phone || '')
        }));
    }, [user]);

    useEffect(() => {
        let active = true;

        const fetchRoom = async () => {
            try {
                setLoading(true);
                const { data } = await api.get(`/rooms/${id}`);
                if (active) {
                    setRoom(data);
                    setError('');
                }
            } catch (err) {
                if (active) {
                    setError(err.response?.data?.message || 'Room details could not be loaded.');
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchRoom();
        return () => {
            active = false;
        };
    }, [id]);

    const rent = Number(room?.rent || 0);
    const securityDeposit = Number(String(room?.securityDeposit || '').replace(/[^\d.]/g, '')) || rent;
    const totalRent = rent * Number(form.durationMonths || 1);
    const total = totalRent + securityDeposit;
    const checkOutDate = addMonths(form.moveInDate, form.durationMonths);
    const customDurationActive = !durations.some((duration) => duration.months === Number(form.durationMonths));
    const displayTitle = formatListingTitle(room?.title, 'Room listing');

    const updateForm = (key, value) => {
        const nextValue = ['mobileNumber', 'emergencyPhone'].includes(key)
            ? sanitizePhoneInput(value)
            : value;
        setForm((current) => ({ ...current, [key]: nextValue }));
    };

    const validateStep = () => {
        if (step === 0) {
            if (!form.moveInDate) return 'Please select your move-in date.';
            if (Number(form.durationMonths) < 1 || Number(form.durationMonths) > 36) return 'Please choose a stay duration between 1 and 36 months.';
            if (Number(form.occupants) < 1) return 'Please add at least one occupant.';
        }

        if (step === 1) {
            if (!form.fullName.trim()) return 'Please enter your full name.';
            if (!isValidIndianMobile(form.mobileNumber)) return 'Please enter a valid 10-digit mobile number.';
            if (!form.idProofType) return 'Please select an ID proof type.';
            if (!idProofFile && !form.idProofImage) return 'Please upload your ID proof image.';
            if (!form.emergencyName.trim()) return 'Please enter an emergency contact name.';
            if (!isValidIndianMobile(form.emergencyPhone)) return 'Please enter a valid emergency contact number.';
        }

        if (step === 2 && !form.agreedToTerms) {
            return 'Please agree to the booking terms before sending the request.';
        }

        return '';
    };

    const goNext = () => {
        const message = validateStep();
        if (message) {
            toast.error(message);
            return;
        }
        setStep((current) => Math.min(current + 1, 3));
    };

    const uploadIdProof = async () => {
        if (!idProofFile) return form.idProofImage || '';

        const payload = new FormData();
        payload.append('image', idProofFile);
        const { data } = await api.post('/upload', payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data.imageUrl || data.url || data.secure_url || '';
    };

    const submitBooking = async () => {
        const message = validateStep();
        if (message) {
            toast.error(message);
            return;
        }

        try {
            setSubmitting(true);
            const idProofImage = await uploadIdProof();
            const payload = {
                roomId: room._id,
                checkInDate: form.moveInDate,
                checkOutDate,
                durationMonths: Number(form.durationMonths),
                occupants: {
                    adults: Number(form.occupants),
                    children: 0,
                    males: 0,
                    females: 0
                },
                fullName: form.fullName.trim(),
                mobileNumber: sanitizePhoneInput(form.mobileNumber),
                profileType: form.purposeOfStay,
                purposeOfStay: form.purposeOfStay,
                idProofType: form.idProofType,
                idProofImage,
                emergencyContact: {
                    name: form.emergencyName.trim(),
                    phone: sanitizePhoneInput(form.emergencyPhone)
                },
                message: form.message.trim(),
                agreedToTerms: form.agreedToTerms
            };

            const { data } = await api.post('/applications', payload);
            setBookingResult(data.application);
            trackUsageEvent('booking_request', {
                metadata: {
                    source: 'booking_request_sent',
                    roomId: room._id,
                    city: room.location?.city,
                    rent: room.rent,
                    durationMonths: Number(form.durationMonths),
                    occupants: Number(form.occupants),
                },
            });
            setStep(3);
            toast.success('Booking request sent to the landlord.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send booking request.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Spinner />;

    if (error || !room) {
        return (
            <main className="min-h-screen bg-light-bg px-4 py-10 dark:bg-dark-bg">
                <div className="mx-auto max-w-2xl rounded-3xl border border-light-border bg-light-card p-8 text-center shadow-sm dark:border-dark-border dark:bg-dark-card">
                    <Home className="mx-auto h-10 w-10 text-brand" />
                    <h1 className="mt-4 text-2xl font-semibold text-light-text dark:text-dark-text">Room unavailable</h1>
                    <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">{error || 'This room could not be found.'}</p>
                    <button type="button" onClick={() => navigate('/rooms')} className="btn-primary mt-6">
                        Browse rooms
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-light-bg pb-24 pt-5 text-light-text dark:bg-dark-bg dark:text-dark-text md:pt-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-light-border bg-light-card px-4 text-sm font-semibold text-light-muted transition hover:border-brand hover:text-brand dark:border-dark-border dark:bg-dark-card dark:text-dark-muted"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <section className="overflow-hidden rounded-3xl border border-light-border bg-light-card shadow-sm dark:border-dark-border dark:bg-dark-card">
                    <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
                        <div className="p-5 sm:p-8">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Request to book</p>
                                    <h1 className="mt-2 text-3xl font-semibold text-light-text dark:text-dark-text">Complete your room request</h1>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-light-muted dark:text-dark-muted">
                                        Your request goes to the landlord first. After approval, you confirm from your applications page.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {steps.map((item, index) => (
                                        <div key={item} className="flex items-center gap-2">
                                            <div className={`flex h-10 min-w-10 items-center justify-center rounded-full text-sm font-bold ${index <= step ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'bg-light-bg text-light-muted dark:bg-dark-input dark:text-dark-muted'}`}>
                                                {index < step || step === 3 ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                                            </div>
                                            <span className={`hidden text-xs font-bold uppercase md:block ${index <= step ? 'text-light-text dark:text-dark-text' : 'text-light-muted dark:text-dark-muted'}`}>{item}</span>
                                            {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-light-muted dark:text-dark-muted" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 h-2 overflow-hidden rounded-full bg-light-bg dark:bg-dark-input">
                                <motion.div
                                    className="h-full rounded-full bg-cyan-500"
                                    initial={false}
                                    animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                                    transition={{ duration: 0.35 }}
                                />
                            </div>

                            <div className="mt-8">
                                {step === 0 && (
                                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">Move-in date</label>
                                            <input
                                                type="date"
                                                min={tomorrow}
                                                value={form.moveInDate}
                                                onChange={(event) => updateForm('moveInDate', event.target.value)}
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-3 block text-sm font-semibold">Duration</label>
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                {durations.map((duration) => (
                                                    <button
                                                        key={duration.months}
                                                        type="button"
                                                        onClick={() => updateForm('durationMonths', duration.months)}
                                                        className={`min-h-[56px] rounded-2xl border px-4 py-3 text-sm font-bold transition ${Number(form.durationMonths) === duration.months ? 'border-cyan-500 bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'border-light-border bg-light-bg text-light-text hover:border-cyan-400 dark:border-dark-border dark:bg-dark-input dark:text-dark-text'}`}
                                                    >
                                                        {duration.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className={`mt-3 rounded-2xl border p-3 transition ${customDurationActive ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10' : 'border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-input'}`}>
                                                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">
                                                    Custom stay
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="36"
                                                        value={form.durationMonths}
                                                        onChange={(event) => updateForm('durationMonths', Math.min(Math.max(Number(event.target.value || 1), 1), 36))}
                                                        className="input-field h-12 flex-1"
                                                        aria-label="Custom stay duration in months"
                                                    />
                                                    <span className="rounded-xl bg-white px-3 py-2 text-xs font-black text-light-muted dark:bg-dark-card dark:text-dark-muted">
                                                        months
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-xs font-semibold text-light-muted dark:text-dark-muted">
                                                    Use custom months for 2, 4, 5, 9 months or a stay extension request.
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">Occupants</label>
                                            <div className="flex max-w-xs items-center rounded-2xl border border-light-border bg-light-bg p-2 dark:border-dark-border dark:bg-dark-input">
                                                <button type="button" onClick={() => updateForm('occupants', Math.max(1, Number(form.occupants) - 1))} className="h-11 w-11 rounded-xl bg-light-card font-bold dark:bg-dark-card">-</button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={form.occupants}
                                                    onChange={(event) => updateForm('occupants', event.target.value)}
                                                    className="h-11 flex-1 bg-transparent text-center text-lg font-bold outline-none"
                                                />
                                                <button type="button" onClick={() => updateForm('occupants', Number(form.occupants || 1) + 1)} className="h-11 w-11 rounded-xl bg-light-card font-bold dark:bg-dark-card">+</button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 1 && (
                                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 sm:gap-5">
                                        <Field label="Full name" icon={UserRound}>
                                            <input value={form.fullName} onChange={(event) => updateForm('fullName', event.target.value)} className="input-field" />
                                        </Field>
                                        <Field label="Mobile number" icon={Users}>
                                            <input value={form.mobileNumber} onChange={(event) => updateForm('mobileNumber', event.target.value)} className="input-field" {...phoneInputProps} />
                                        </Field>
                                        <Field label="Purpose of stay" icon={Home}>
                                            <select value={form.purposeOfStay} onChange={(event) => updateForm('purposeOfStay', event.target.value)} className="input-field">
                                                <option>Travelling</option>
                                                <option>Working Professional</option>
                                                <option>Family</option>
                                            </select>
                                        </Field>
                                        <Field label="ID proof type" icon={IdCard}>
                                            <select value={form.idProofType} onChange={(event) => updateForm('idProofType', event.target.value)} className="input-field">
                                                <option>Aadhaar Card</option>
                                                <option>Voter ID</option>
                                                <option>Passport</option>
                                                <option>Driving License</option>
                                                <option>College ID</option>
                                            </select>
                                        </Field>
                                        <div className="col-span-2">
                                            <label className="mb-2 block text-sm font-semibold">ID proof upload</label>
                                            <label className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-light-border bg-light-bg px-4 text-center transition hover:border-brand dark:border-dark-border dark:bg-dark-input">
                                                <UploadCloud className="h-8 w-8 text-brand" />
                                                <span className="mt-3 text-sm font-semibold">{idProofFile ? idProofFile.name : 'Upload a clear ID proof image'}</span>
                                                <span className="mt-1 text-xs text-light-muted dark:text-dark-muted">JPG, PNG, or WEBP accepted</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(event) => setIdProofFile(event.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                        <Field label="Emergency contact name" icon={ShieldCheck}>
                                            <input value={form.emergencyName} onChange={(event) => updateForm('emergencyName', event.target.value)} className="input-field" />
                                        </Field>
                                        <Field label="Emergency contact phone" icon={ShieldCheck}>
                                            <input value={form.emergencyPhone} onChange={(event) => updateForm('emergencyPhone', event.target.value)} className="input-field" {...phoneInputProps} />
                                        </Field>
                                        <div className="col-span-2">
                                            <label className="mb-2 block text-sm font-semibold">Message to landlord</label>
                                            <textarea
                                                value={form.message}
                                                onChange={(event) => updateForm('message', event.target.value)}
                                                rows="4"
                                                className="input-field resize-none"
                                                placeholder="Share your moving timeline, occupation, or any question."
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                                        <div className="rounded-2xl border border-light-border bg-light-bg p-5 dark:border-dark-border dark:bg-dark-input">
                                            <div className="flex gap-4">
                                                <img src={getImage(room)} alt={displayTitle} className="h-24 w-28 rounded-2xl object-cover" />
                                                <div>
                                                    <h2 className="text-lg font-semibold">{displayTitle}</h2>
                                                    <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">{room.location?.fullAddress || room.location?.address || room.location?.city}</p>
                                                    <p className="mt-2 text-sm font-bold text-brand">{money(room.rent)} / month</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-light-border bg-light-card p-5 dark:border-dark-border dark:bg-dark-card">
                                            <h3 className="text-base font-semibold">Price breakdown</h3>
                                            <PriceRow label="Monthly rent" value={money(rent)} />
                                            <PriceRow label="Duration" value={`${form.durationMonths} month${Number(form.durationMonths) > 1 ? 's' : ''}`} />
                                            <PriceRow label="Rent subtotal" value={money(totalRent)} />
                                            <PriceRow label="Security deposit" value={money(securityDeposit)} />
                                            <div className="mt-4 flex items-center justify-between border-t border-light-border pt-4 text-base font-bold dark:border-dark-border">
                                                <span>Total payable after approval</span>
                                                <span>{money(total)}</span>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-400/20">
                                            {room.cancellationPolicy || 'Requesting is free. Final confirmation happens only after the landlord approves your request.'}
                                        </div>
                                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-light-border p-4 dark:border-dark-border">
                                            <input
                                                type="checkbox"
                                                checked={form.agreedToTerms}
                                                onChange={(event) => updateForm('agreedToTerms', event.target.checked)}
                                                className="mt-1 h-5 w-5 rounded border-light-border text-cyan-500 focus:ring-cyan-500"
                                            />
                                            <span className="text-sm leading-6 text-light-muted dark:text-dark-muted">
                                                I agree that this request will be shared with the landlord for verification and approval.
                                            </span>
                                        </label>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-2xl text-center">
                                        <motion.div
                                            initial={{ scale: 0.75, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 170, damping: 14 }}
                                            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/25"
                                        >
                                            <CheckCircle2 className="h-12 w-12" />
                                        </motion.div>
                                        <h2 className="mt-6 text-3xl font-semibold">Booking request sent</h2>
                                        <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">Booking ID</p>
                                        <p className="mt-1 font-mono text-lg font-bold text-brand">{bookingResult?._id || 'Created'}</p>
                                        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
                                            {['Landlord reviews your profile', 'You get approval notification', 'Confirm booking from applications'].map((item, index) => (
                                                <div key={item} className="rounded-2xl border border-light-border p-4 dark:border-dark-border">
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-sm font-bold text-white">{index + 1}</span>
                                                    <p className="mt-3 text-sm font-semibold">{item}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                                            <Link to="/profile/my-applications" className="btn-primary">View my applications</Link>
                                            <Link to="/rooms" className="btn-outline">Explore more rooms</Link>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {step < 3 && (
                                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                    <button type="button" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0} className="btn-outline disabled:opacity-40">
                                        Previous
                                    </button>
                                    {step === 2 ? (
                                        <button type="button" onClick={submitBooking} disabled={submitting} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-70">
                                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                            Send booking request
                                        </button>
                                    ) : (
                                        <button type="button" onClick={goNext} className="btn-primary">
                                            Continue
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <aside className="border-t border-light-border bg-light-bg p-5 dark:border-dark-border dark:bg-dark-input lg:border-l lg:border-t-0 lg:p-7">
                            <div className="sticky top-24 space-y-5">
                                <img src={getImage(room)} alt={displayTitle} className="h-64 w-full rounded-3xl object-cover shadow-sm" />
                                <div>
                                    <h2 className="text-2xl font-semibold">{displayTitle}</h2>
                                    <p className="mt-2 text-sm leading-6 text-light-muted dark:text-dark-muted">{room.location?.fullAddress || room.location?.address || room.location?.city}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <MiniStat icon={CalendarDays} label="Move-in" value={form.moveInDate} />
                                    <MiniStat icon={Users} label="Occupants" value={form.occupants} />
                                    <MiniStat icon={FileBadge2} label="Duration" value={`${form.durationMonths}M`} />
                                    <MiniStat icon={ShieldCheck} label="Request" value="Free" />
                                </div>
                                <div className="rounded-2xl bg-light-card p-4 dark:bg-dark-card">
                                    <PriceRow label="Monthly rent" value={money(rent)} />
                                    <PriceRow label="Estimated total" value={money(total)} />
                                </div>
                            </div>
                        </aside>
                    </div>
                </section>
            </div>
        </main>
    );
};

const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 text-brand" />
            {label}
        </label>
        {children}
    </div>
);

const PriceRow = ({ label, value }) => (
    <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-light-muted dark:text-dark-muted">{label}</span>
        <span className="font-semibold">{value}</span>
    </div>
);

const MiniStat = ({ icon: Icon, label, value }) => (
    <div className="rounded-2xl bg-light-card p-4 dark:bg-dark-card">
        <Icon className="h-5 w-5 text-brand" />
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-light-muted dark:text-dark-muted">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
);

export default BookingPage;
