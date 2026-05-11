import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowLeft, BadgeCheck, Download, FileText, Home, ShieldCheck } from 'lucide-react';
import api from '../../api';
import Spinner from '../../components/common/Spinner';
import BookingStatusTimeline from '../../components/features/booking/BookingStatusTimeline';
import { useSettings } from '../../context/SettingsContext';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

const buildBreakdown = (application, settings) => {
    if (application?.amountBreakdown?.total) return application.amountBreakdown;

    const rent = Number(application?.room?.rent || 0);
    const securityDeposit = Number(String(application?.room?.securityDeposit || '').replace(/[^\d.]/g, '')) || rent;
    const platformFee = Number(settings?.platformFee || 0);
    return { rent, securityDeposit, platformFee, total: rent + securityDeposit + platformFee };
};

const RentalAgreementPage = () => {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplication = async () => {
            try {
                const { data } = await api.get(`/applications/${applicationId}`);
                setApplication(data);

                if (data.status !== 'confirmed') {
                    toast.error('This booking is not confirmed yet.');
                    navigate('/profile/my-applications');
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Could not load rental agreement.');
                navigate('/profile/my-applications');
            } finally {
                setLoading(false);
            }
        };

        fetchApplication();
    }, [applicationId, navigate]);

    const breakdown = useMemo(() => buildBreakdown(application, settings), [application, settings]);

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!application) {
        return <div className="py-20 text-center text-rose-600">Agreement not found.</div>;
    }

    const room = application.room || {};
    const landlord = application.landlord || {};
    const student = application.student || {};
    const agreementDate = application.confirmedAt || application.createdAt;
    const stayDates = [
        application.checkInDate ? format(new Date(application.checkInDate), 'dd MMM yyyy') : null,
        application.checkOutDate ? format(new Date(application.checkOutDate), 'dd MMM yyyy') : null,
    ].filter(Boolean).join(' - ');

    const handleDownloadPdf = () => {
        const previousTitle = document.title;
        document.title = `RoomRadar Agreement - ${application._id}`;
        window.print();
        setTimeout(() => {
            document.title = previousTitle;
        }, 500);
    };

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-secondary-900 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        to="/profile/my-applications"
                        className="inline-flex w-max items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Applications
                    </Link>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="no-print inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-cyan-700 dark:bg-white dark:text-slate-950"
                    >
                        <Download className="h-4 w-4" />
                        Download PDF
                    </button>
                </div>

                <section className="agreement-print-root overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 dark:border-secondary-700 dark:bg-secondary-800 dark:shadow-black/20">
                    <div className="border-b border-slate-200 bg-slate-950 p-6 text-white dark:border-secondary-700 sm:p-8">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase ring-1 ring-white/20">
                                    <BadgeCheck className="h-4 w-4 text-cyan-200" />
                                    Confirmed booking agreement
                                </div>
                                <h1 className="mt-4 text-3xl font-black sm:text-5xl">Digital Rental Agreement</h1>
                                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/75">
                                    This summary reflects the confirmed booking between tenant and landlord on RoomRadar.
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white/10 p-4 text-sm font-bold ring-1 ring-white/15">
                                <p className="text-white/60">Agreement date</p>
                                <p className="mt-1 text-white">{agreementDate ? format(new Date(agreementDate), 'dd MMM yyyy') : 'Today'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_320px]">
                        <div className="space-y-6">
                            <BookingStatusTimeline status="confirmed" />

                            <section className="rounded-3xl border border-slate-200 p-5 dark:border-secondary-700">
                                <div className="flex items-center gap-3">
                                    <Home className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
                                    <h2 className="text-xl font-black text-slate-950 dark:text-white">Property</h2>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <Detail label="Room" value={room.title} />
                                    <Detail label="Address" value={room.location?.fullAddress || [room.location?.city, room.location?.state].filter(Boolean).join(', ')} />
                                    <Detail label="Stay dates" value={stayDates || 'Not set'} />
                                    <Detail label="Booking ID" value={application._id} />
                                </div>
                            </section>

                            <section className="grid gap-4 md:grid-cols-2">
                                <PartyCard title="Landlord" name={landlord.name} email={landlord.email} phone={landlord.mobileNumber} />
                                <PartyCard title="Tenant" name={application.fullName || student.name} email={student.email} phone={application.mobileNumber || student.mobileNumber} />
                            </section>

                            <section className="rounded-3xl border border-slate-200 p-5 dark:border-secondary-700">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
                                    <h2 className="text-xl font-black text-slate-950 dark:text-white">Terms Snapshot</h2>
                                </div>
                                <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600 dark:text-secondary-300">
                                    <li>The tenant agrees to pay monthly rent as listed in this agreement.</li>
                                    <li>The security deposit remains refundable subject to room condition and local policy.</li>
                                    <li>Move-in coordination, identity checks, and final handover should stay inside RoomRadar chat.</li>
                                    <li>Any change after confirmation should be mutually acknowledged by both sides.</li>
                                </ul>
                            </section>
                        </div>

                        <aside className="space-y-4">
                            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-secondary-700 dark:bg-secondary-900">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
                                    <h2 className="text-xl font-black text-slate-950 dark:text-white">Financials</h2>
                                </div>
                                <div className="mt-5 space-y-3">
                                    <PriceRow label="Monthly rent" value={breakdown.rent} />
                                    <PriceRow label="Security deposit" value={breakdown.securityDeposit} />
                                    <PriceRow label="Platform protection" value={breakdown.platformFee} />
                                    <div className="border-t border-slate-200 pt-3 dark:border-secondary-700">
                                        <PriceRow label="Total confirmed" value={breakdown.total} strong />
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                <p className="text-sm font-black text-emerald-800 dark:text-emerald-100">Both sides confirmed</p>
                                <p className="mt-2 text-sm font-semibold leading-6 text-emerald-700 dark:text-emerald-200">
                                    The landlord approved this request and the tenant completed final confirmation.
                                </p>
                            </section>
                        </aside>
                    </div>
                </section>
            </div>
        </div>
    );
};

const Detail = ({ label, value }) => (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
        <p className="text-xs font-black uppercase text-slate-500">{label}</p>
        <p className="mt-2 break-words text-sm font-black text-slate-950 dark:text-white">{value || 'Not available'}</p>
    </div>
);

const PartyCard = ({ title, name, email, phone }) => (
    <section className="rounded-3xl border border-slate-200 p-5 dark:border-secondary-700">
        <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">{title}</p>
        <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{name || 'Not available'}</h3>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-secondary-300">{email || 'Email not shared'}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-secondary-300">{phone || 'Phone not shared'}</p>
    </section>
);

const PriceRow = ({ label, value, strong }) => (
    <div className="flex items-center justify-between gap-3 text-sm">
        <span className={strong ? 'font-black text-slate-950 dark:text-white' : 'font-semibold text-slate-600 dark:text-secondary-300'}>{label}</span>
        <span className={strong ? 'text-xl font-black text-cyan-600 dark:text-cyan-300' : 'font-black text-slate-950 dark:text-white'}>{money(value)}</span>
    </div>
);

export default RentalAgreementPage;
