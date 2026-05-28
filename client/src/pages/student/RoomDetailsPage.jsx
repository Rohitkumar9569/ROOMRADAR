import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api';
import Spinner from '../../components/common/Spinner';
import ImageGallery from '../../components/features/rooms/ImageGallery';
import BookingPanel from '../../components/features/booking/BookingPanel';
import AmenitiesList from '../../components/features/rooms/AmenitiesList';
import ReviewsSection from '../../components/features/rooms/ReviewsSection';
import InquiryModal from '../../components/features/chat/InquiryModal';
import RoomCard from '../../components/features/rooms/RoomCard';
import SupportTicketModal from '../../components/support/SupportTicketModal';
import { useAuth } from '../../context/AuthContext';
import { formatRoomFieldValue, getRulesSection, getRoomFieldValue, getVisibleDetailFields } from '../../utils/roomFieldUtils';
import { formatListingTitle } from '../../utils/listingDisplay';
import { trackUsageEvent } from '../../utils/usageAnalytics';
import { triggerHaptic } from '../../utils/haptics';
import { shareContent } from '../../utils/nativeShare';
import {
    ArrowLeft,
    BadgeCheck,
    BedDouble,
    Building2,
    CalendarCheck,
    CalendarDays,
    ChevronRight,
    Clock3,
    Eye,
    Flag,
    Flame,
    Heart,
    Home,
    IndianRupee,
    MapPin,
    MessageCircle,
    ReceiptText,
    Share2,
    ShieldCheck,
    Sparkles,
    Star,
    TrainFront,
    Users,
    Wifi,
} from 'lucide-react';

const RoomLocationMap = lazy(() => import('../../components/features/rooms/RoomLocationMap'));

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

const parseMoneyValue = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') {
        if (/\b(no\s*deposit|none|free|n\/a|na)\b/i.test(value)) return 0;
        const withoutCurrencyWords = value.replace(/\b(rs|inr)\b/gi, '');
        if (/[a-zA-Z]/.test(withoutCurrencyWords)) return undefined;
    }
    const numericValue = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : undefined;
};

const getImageUrl = (image) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return image.url || image.secure_url || image.src || '';
};

const getAddress = (room) => (
    room.location?.fullAddress
    || [room.location?.city, room.location?.state].filter(Boolean).join(', ')
    || 'Location available after request'
);

const factsForRoom = (room) => [
    { label: 'Room type', value: room.roomType || 'Private room', Icon: Home },
    { label: 'Beds', value: `${room.beds || 1} bed${Number(room.beds || 1) > 1 ? 's' : ''}`, Icon: BedDouble },
    { label: 'For', value: room.tenantPreferences?.familyStatus || room.familyStatus || 'Any', Icon: Users },
    { label: 'Policy', value: room.cancellationPolicy || 'Flexible', Icon: CalendarCheck },
];

const detailSectionMeta = {
    basicDetails: { title: 'Room basics', Icon: Home },
    location: { title: 'Address snapshot', Icon: Building2 },
    pricing: { title: 'Costs & terms', Icon: IndianRupee },
    nearby: { title: 'Nearby access', Icon: TrainFront },
};

const excludedDetailKeys = new Set([
    'title',
    'description',
    'fullAddress',
    'rent',
    'beds',
    'roomType',
    'familyStatus',
    'cancellationPolicy',
]);

const compactDetailGroups = (fields) => fields.reduce((groups, item) => {
    const sectionId = item.field.sectionId || 'basicDetails';
    if (!detailSectionMeta[sectionId]) return groups;

    const current = groups[sectionId] || {
        id: sectionId,
        ...detailSectionMeta[sectionId],
        fields: [],
    };

    current.fields.push(item);
    return { ...groups, [sectionId]: current };
}, {});

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getEntityId = (value) => String(value?._id || value || '');

const getServerRecommendationTier = (candidate) => {
    const tier = Number(candidate?._recommendation?.tier);
    if (Number.isFinite(tier)) return tier;
    const group = candidate?._recommendation?.group;
    if (group === 'nearby') return 0;
    if (group === 'host') return 1;
    if (group === 'similar') return 2;
    return null;
};

const getSimilarityScore = (candidate, source) => {
    if (!candidate || !source || String(candidate._id) === String(source._id)) return -1;
    const serverScore = Number(candidate._recommendation?.score);
    if (Number.isFinite(serverScore)) return serverScore;

    const candidateRent = Number(candidate.rent || 0);
    const sourceRent = Number(source.rent || 0);
    const rentGap = candidateRent && sourceRent ? Math.abs(candidateRent - sourceRent) / sourceRent : 1;
    let score = 0;

    if (normalizeText(candidate.location?.city) && normalizeText(candidate.location?.city) === normalizeText(source.location?.city)) score += 50;
    if (normalizeText(candidate.location?.locality) && normalizeText(candidate.location?.locality) === normalizeText(source.location?.locality)) score += 18;
    if (normalizeText(candidate.roomType) && normalizeText(candidate.roomType) === normalizeText(source.roomType)) score += 30;
    if (candidateRent && sourceRent) score += Math.max(0, 24 - Math.round(rentGap * 40));
    if (Number(candidate.beds || 0) === Number(source.beds || 0)) score += 8;
    if (normalizeText(candidate.gender) && normalizeText(candidate.gender) === normalizeText(source.gender)) score += 5;
    if (normalizeText(candidate.familyStatus) && normalizeText(candidate.familyStatus) === normalizeText(source.familyStatus)) score += 5;

    score += Math.min(Number(candidate.averageRating || 0), 5);
    score += Math.min(Number(candidate.numReviews || 0), 20) / 5;
    return score;
};

const rankSimilarRooms = (rooms, source) => {
    const sourceLandlordId = getEntityId(source?.landlord);

    return (Array.isArray(rooms) ? rooms : [])
    .map((candidate, index) => {
        const sameCity = normalizeText(candidate.location?.city) && normalizeText(candidate.location?.city) === normalizeText(source.location?.city);
        const sameLocality = normalizeText(candidate.location?.locality) && normalizeText(candidate.location?.locality) === normalizeText(source.location?.locality);
        const sameLandlord = sourceLandlordId && getEntityId(candidate.landlord) === sourceLandlordId;
        const serverTier = getServerRecommendationTier(candidate);

        return {
            candidate,
            index,
            group: serverTier ?? (sameCity || sameLocality ? 0 : sameLandlord ? 1 : 2),
            score: getSimilarityScore(candidate, source),
        };
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => (
        a.group - b.group
        || b.score - a.score
        || Number(b.candidate.averageRating || 0) - Number(a.candidate.averageRating || 0)
        || Number(b.candidate.numReviews || 0) - Number(a.candidate.numReviews || 0)
        || new Date(b.candidate.createdAt || 0).getTime() - new Date(a.candidate.createdAt || 0).getTime()
        || a.index - b.index
    ))
    .slice(0, 8)
    .map(({ candidate }) => candidate);
};

const Avatar = ({ user }) => (
    <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-xl font-black text-white shadow-sm dark:bg-white dark:text-slate-950">
        {user?.avatarUrl || user?.profilePicture ? (
            <img src={user.avatarUrl || user.profilePicture} alt={user.name || 'Host'} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
            user?.name?.charAt(0)?.toUpperCase() || 'H'
        )}
        {user?.isOnline && (
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-dark-bg" />
        )}
    </div>
);

const RoomDetailsPage = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, addToWishlist, removeFromWishlist } = useAuth();
    const [room, setRoom] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [similarRooms, setSimilarRooms] = useState([]);
    const [sentiment, setSentiment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [showMobileBookingBar, setShowMobileBookingBar] = useState(false);
    const [searchRadius, setSearchRadius] = useState(5);

    useEffect(() => {
        const fetchRoomDetails = async () => {
            if (!roomId) return;
            setLoading(true);
            setError(null);

            try {
                const [roomRes, reviewsRes, sentimentRes] = await Promise.all([
                    api.get(`/rooms/${roomId}`),
                    api.get(`/reviews/${roomId}`).catch(() => ({ data: [] })),
                    api.get(`/rooms/${roomId}/sentiment`).catch(() => ({ data: null })),
                ]);

                const roomData = roomRes.data.data || roomRes.data;
                setRoom(roomData);
                trackUsageEvent('room_view', {
                    metadata: {
                        roomId,
                        city: roomData.location?.city,
                        rent: roomData.rent,
                        status: roomData.status,
                        listingCategory: roomData.listingCategory,
                    },
                });
                setReviews(reviewsRes.data.data || reviewsRes.data || []);
                setSentiment(sentimentRes.data || null);

                try {
                    const { data } = await api.get(`/rooms/similar/${roomId}`);
                    setSimilarRooms(rankSimilarRooms(data.data || data || [], roomData));
                } catch {
                    if (roomData.location?.city) {
                        const { data } = await api.get(`/rooms?city=${encodeURIComponent(roomData.location.city)}&limit=24&exclude=${roomId}&sort=rating`);
                        setSimilarRooms(rankSimilarRooms(data.data || data || [], roomData));
                    }
                }
            } catch {
                setError('Could not fetch room details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchRoomDetails();
    }, [roomId]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mobileQuery = window.matchMedia('(max-width: 1023px)');
        let frameId = null;

        const syncBookingBar = () => {
            frameId = null;
            if (!mobileQuery.matches) {
                setShowMobileBookingBar(false);
                return;
            }

            const threshold = Math.min(460, Math.max(280, window.innerHeight * 0.48));
            setShowMobileBookingBar(window.scrollY > threshold);
        };

        const scheduleSync = () => {
            if (frameId) return;
            frameId = window.requestAnimationFrame(syncBookingBar);
        };

        syncBookingBar();
        window.addEventListener('scroll', scheduleSync, { passive: true });
        window.addEventListener('resize', scheduleSync);

        if (mobileQuery.addEventListener) {
            mobileQuery.addEventListener('change', scheduleSync);
        } else {
            mobileQuery.addListener(scheduleSync);
        }

        return () => {
            window.removeEventListener('scroll', scheduleSync);
            window.removeEventListener('resize', scheduleSync);
            if (mobileQuery.removeEventListener) {
                mobileQuery.removeEventListener('change', scheduleSync);
            } else {
                mobileQuery.removeListener(scheduleSync);
            }
            if (frameId) window.cancelAnimationFrame(frameId);
        };
    }, [roomId]);

    const images = useMemo(() => {
        if (!room) return [];
        const source = Array.isArray(room.images) && room.images.length
            ? room.images
            : Array.isArray(room.imageUrls) && room.imageUrls.length
                ? room.imageUrls
                : [room.imageUrl].filter(Boolean);
        return source.map(getImageUrl).filter(Boolean);
    }, [room]);

    useEffect(() => {
        if (!room || typeof document === 'undefined') return undefined;

        const title = `${formatListingTitle(room.title, 'Room listing')} - RoomRadar`;
        const description = `${money(room.rent)}/month room in ${room.location?.city || getAddress(room)}. Chat with the landlord and request booking on RoomRadar.`;
        const previousTitle = document.title;
        const descriptionMeta = document.querySelector('meta[name="description"]');
        const previousDescription = descriptionMeta?.getAttribute('content');

        document.title = title;
        descriptionMeta?.setAttribute('content', description);

        return () => {
            document.title = previousTitle || 'RoomRadar';
            if (descriptionMeta && previousDescription) {
                descriptionMeta.setAttribute('content', previousDescription);
            }
        };
    }, [room]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-light-bg dark:bg-dark-bg">
                <Spinner />
            </div>
        );
    }

    if (error || !room) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-light-bg p-6 text-center dark:bg-dark-bg">
                <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 shadow-sm dark:border-rose-500/20 dark:bg-dark-card">
                    <p className="text-lg font-black text-rose-700 dark:text-rose-200">{error || 'Room not found.'}</p>
                    <button onClick={() => navigate('/rooms')} className="btn-primary mt-6">
                        Browse rooms
                    </button>
                </div>
            </div>
        );
    }

    const rating = Number(room.averageRating || room.rating || 0);
    const reviewCount = room.numReviews || reviews.length || 0;
    const address = getAddress(room);
    const hostSince = room.landlord?.createdAt ? format(new Date(room.landlord.createdAt), 'MMMM yyyy') : null;
    const rentValue = Number(room.rent || 0);
    const depositValue = parseMoneyValue(room.securityDeposit) ?? rentValue;
    const availableDate = room.availableFrom ? new Date(room.availableFrom) : null;
    const availableLabel = availableDate && !Number.isNaN(availableDate.getTime())
        ? format(availableDate, 'd MMM yyyy')
        : 'Available now';
    const heroStats = [
        { label: 'Monthly rent', value: money(rentValue), Icon: IndianRupee },
        { label: 'Deposit', value: money(depositValue), Icon: ReceiptText },
        { label: 'Move-in', value: availableLabel, Icon: CalendarDays },
    ];
    const configDetailFields = getVisibleDetailFields(room)
        .filter(({ field }) => !excludedDetailKeys.has(field.key) && !['amenities', 'rules'].includes(field.sectionId));
    const detailGroups = Object.values(compactDetailGroups(configDetailFields));
    const rulesSection = getRulesSection();
    const visibleRules = rulesSection.fields
        .map((field) => ({ field, value: getRoomFieldValue(room, { ...field, sectionId: 'rules' }) }))
        .filter(({ field, value }) => value !== undefined && value !== null && value !== '' && value !== false && formatRoomFieldValue(field, value) !== '');
    const mapCoordinates = room.location?.coordinates?.length === 2
        ? [room.location.coordinates[1], room.location.coordinates[0]]
        : null;
    const nearbySearchUrl = mapCoordinates
        ? `/rooms?${new URLSearchParams({
            city: room.location?.city || '',
            latitude: String(mapCoordinates[0]),
            longitude: String(mapCoordinates[1]),
            radius: String(searchRadius),
            sort: 'popular',
        }).toString()}`
        : `/rooms?city=${encodeURIComponent(room.location?.city || '')}`;
    const isWishlisted = user?.wishlist?.some((item) => String(item?._id || item) === String(room._id));
    const normalizedStatus = String(room.status || '').toLowerCase();
    const isBooked = ['booked', 'confirmed'].includes(normalizedStatus);
    const isBookable = ['published', 'available'].includes(normalizedStatus);
    const availabilityBadgeLabel = isBooked
        ? `Booked${availableLabel !== 'Available now' ? ` until ${availableLabel}` : ''}`
        : isBookable
            ? 'Available now'
            : 'Not accepting requests';
    const minimumStayValue = Math.max(0, Number(room.minimumStay?.value || 0));
    const minimumStayUnit = String(room.minimumStay?.unit || 'month').toLowerCase();
    const minimumStayText = minimumStayValue
        ? `Minimum ${minimumStayValue} ${minimumStayUnit}${minimumStayValue === 1 || minimumStayUnit.endsWith('s') ? '' : 's'}`
        : 'Flexible stay terms';
    const displayTitle = formatListingTitle(room.title, 'Room listing');
    const isVerifiedLandlord = Boolean(
        room.landlord?.isVerified
        || room.landlord?.kyc_status === 'Verified'
        || ['verified', 'premium'].includes(String(room.landlord?.verificationLevel || '').toLowerCase())
        || room.landlord?.verifications?.identity
    );
    const socialProofCards = [
        room.verifications?.property
            ? { title: 'RoomRadar Assured', text: 'Listing details are verified for safer shortlisting.', Icon: ShieldCheck, tone: 'emerald' }
            : null,
        isVerifiedLandlord
            ? { title: 'Verified landlord', text: 'Host identity signals are checked by RoomRadar.', Icon: BadgeCheck, tone: 'cyan' }
            : null,
        Number(room.views || 0) > 0
            ? { title: 'Popular listing', text: `${Number(room.views || 0).toLocaleString('en-IN')} room views recorded.`, Icon: Eye, tone: 'amber' }
            : null,
        Number(room.activeApplicationsCount || 0) > 0
            ? { title: 'High intent', text: `${room.activeApplicationsCount} active request${Number(room.activeApplicationsCount) > 1 ? 's' : ''} from seekers.`, Icon: Flame, tone: 'rose' }
            : null,
        Number(room.responseRate || 0) >= 80
            ? { title: 'Fast responder', text: `${room.responseRate}% host response rate.`, Icon: MessageCircle, tone: 'cyan' }
            : null,
    ].filter(Boolean).slice(0, 4);
    const proofToneClass = {
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100',
        cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-100',
        amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100',
        rose: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100',
    };

    const handleShare = async () => {
        triggerHaptic('tap');
        const url = `${window.location.origin}/room/${room._id}`;
        try {
            const result = await shareContent({
                title: `${displayTitle} - RoomRadar`,
                text: `${money(rentValue)}/month room in ${room.location?.city || 'RoomRadar'}`,
                url,
            });

            if (result.status === 'copied') toast.success('Room link copied.');
            if (result.status === 'failed') toast.error('Could not share this room.');
        } catch {
            toast.error('Could not share this room.');
        }
    };

    const requireTravellerLogin = (actionLabel) => {
        if (user) return true;
        toast.error(`Please log in to ${actionLabel}.`);
        navigate('/login', { state: { from: location } });
        return false;
    };

    const handleContactLandlord = () => {
        if (!requireTravellerLogin('message the landlord')) return;
        triggerHaptic('tap');
        setIsInquiryModalOpen(true);
    };

    const handleRequestToBook = () => {
        if (!isBookable) {
            triggerHaptic('warning');
            toast.error('This room is not accepting booking requests right now.');
            return;
        }
        triggerHaptic('tap');
        navigate(`/room/${room._id}/book`);
    };

    const handleReportListing = () => {
        if (!requireTravellerLogin('report this listing')) return;
        triggerHaptic('warning');
        setIsReportModalOpen(true);
    };

    const handleWishlist = async () => {
        if (!user) {
            requireTravellerLogin('use wishlist');
            return;
        }
        triggerHaptic('tap');
        if (isWishlisted) {
            const removed = await removeFromWishlist(room._id);
            if (!removed) {
                toast.error('Could not update wishlist.');
                return;
            }
            trackUsageEvent('wishlist_remove', {
                metadata: {
                    roomId: room._id,
                    context: 'room_details',
                    city: room.location?.city,
                },
            });
            toast.success('Removed from wishlist.');
        } else {
            const added = await addToWishlist(room._id);
            if (!added) {
                toast.error('Could not update wishlist.');
                return;
            }
            trackUsageEvent('wishlist_add', {
                metadata: {
                    roomId: room._id,
                    context: 'room_details',
                    city: room.location?.city,
                },
            });
            toast.success('Added to wishlist.');
        }
    };

    return (
        <div className="min-h-screen bg-light-bg pb-[calc(var(--rr-bottom-nav-height)+9.25rem)] text-light-text dark:bg-dark-bg dark:text-dark-text lg:pb-0">
            <div className="sticky top-0 z-40 hidden border-b border-light-border bg-white/90 backdrop-blur-xl dark:border-dark-border dark:bg-dark-sidebar/90 md:block">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-8">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-light-muted transition hover:bg-light-bg hover:text-cyan-600 dark:text-dark-muted dark:hover:bg-dark-input dark:hover:text-cyan-300"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden md:inline">Back</span>
                    </button>

                    <p className="hidden max-w-sm truncate text-sm font-black md:block">{displayTitle}</p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleShare}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-light-border px-3 text-sm font-black transition hover:bg-light-card dark:border-dark-border dark:hover:bg-dark-card"
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Share</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleWishlist}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-light-border px-3 text-sm font-black transition hover:bg-light-card dark:border-dark-border dark:hover:bg-dark-card"
                        >
                            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-brand text-brand' : ''}`} />
                            <span className="hidden md:inline">Save</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleReportListing}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-rose-200 px-3 text-sm font-black text-rose-600 transition hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-200 dark:hover:bg-rose-500/10"
                        >
                            <Flag className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Report</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-7xl px-4 pb-6 pt-4 md:px-8 md:py-6">
                <section className="mb-5 md:mb-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                            !isBookable
                                ? 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}>
                            {availabilityBadgeLabel}
                        </span>
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                            {room.verifications?.property ? 'RoomRadar Assured' : 'Listed on RoomRadar'}
                        </span>
                        {room.createdAt && Date.now() - new Date(room.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30 && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                New listing
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleReportListing}
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/20 md:hidden"
                        >
                            <Flag className="h-3.5 w-3.5" />
                            Report
                        </button>
                    </div>
                    <h1 className="max-w-4xl text-[1.7rem] font-black leading-[1.08] tracking-tight text-light-text dark:text-dark-text md:text-3xl lg:text-4xl">
                        {displayTitle}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-light-muted dark:text-dark-muted">
                        {rating > 0 && (
                            <span className="inline-flex items-center gap-1 font-black text-light-text dark:text-dark-text">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                {rating.toFixed(1)}
                                <span className="font-semibold text-light-muted dark:text-dark-muted">({reviewCount} reviews)</span>
                            </span>
                        )}
                        {rating > 0 && <span aria-hidden="true">-</span>}
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-cyan-500" />
                            {room.location?.city || 'City'}, {room.location?.state || 'India'}
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 md:max-w-2xl md:gap-3">
                        {heroStats.map(({ label, value, Icon }) => (
                            <div key={label} className="rounded-2xl border border-light-border bg-white p-3 shadow-sm dark:border-dark-border dark:bg-dark-card">
                                <Icon className="h-4 w-4 text-cyan-500" />
                                <p className="mt-2 text-[10px] font-black uppercase leading-tight text-light-muted dark:text-dark-muted">{label}</p>
                                <p className="mt-1 truncate text-xs font-black sm:text-sm">{value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-7 overflow-hidden rounded-2xl border border-light-border bg-white p-1.5 shadow-xl shadow-slate-950/5 dark:border-dark-border dark:bg-dark-card dark:shadow-black/20 md:mb-10 md:rounded-3xl md:p-2">
                    <ImageGallery images={images} />
                </section>

                <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
                    <div className="min-w-0 space-y-7 lg:space-y-10">
                        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {factsForRoom(room).map(({ label, value, Icon }) => (
                                <div key={label} className="rounded-2xl border border-light-border bg-white p-3 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-4">
                                    <Icon className="h-5 w-5 text-cyan-500" />
                                    <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">{label}</p>
                                    <p className="mt-1 truncate text-sm font-black">{value}</p>
                                </div>
                            ))}
                        </section>

                        {socialProofCards.length > 0 && (
                            <section className="grid gap-2 sm:grid-cols-2">
                                {socialProofCards.map(({ title, text, Icon, tone }) => (
                                    <div key={title} className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${proofToneClass[tone] || proofToneClass.cyan}`}>
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-white/10">
                                                <Icon className="h-5 w-5" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black">{title}</p>
                                                <p className="mt-1 text-xs font-bold leading-5 opacity-80 sm:text-sm">{text}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}

                        <section className="border-b border-light-border pb-7 dark:border-dark-border md:pb-8">
                            <div className="flex items-center gap-4">
                                <Avatar user={room.landlord} />
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-xl font-black md:text-2xl">Hosted by {room.landlord?.name || 'RoomRadar host'}</h2>
                                    <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">
                                        {hostSince ? `Member since ${hostSince}` : 'Verified RoomRadar host'}
                                        {room.responseRate !== null && room.responseRate !== undefined ? ` - ${room.responseRate}% response rate` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleContactLandlord}
                                    className="hidden rounded-xl border border-light-border px-4 py-2 text-sm font-black transition hover:bg-light-card dark:border-dark-border dark:hover:bg-dark-card sm:inline-flex"
                                >
                                    Message host
                                </button>
                                <BadgeCheck className="hidden h-6 w-6 flex-shrink-0 text-cyan-500 md:block" />
                            </div>
                        </section>

                        <section className="border-b border-light-border pb-7 dark:border-dark-border md:pb-8">
                            <h2 className="text-xl font-black md:text-2xl">About this place</h2>
                            <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-light-muted dark:text-dark-muted">
                                {room.description || 'A thoughtfully listed room with the essentials room seekers and professionals need for a comfortable stay.'}
                            </p>
                        </section>

                        {detailGroups.length > 0 && (
                            <section className="border-b border-light-border pb-7 dark:border-dark-border md:pb-8">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Listing details</p>
                                <h2 className="mt-1 text-xl font-black md:text-2xl">Fast scan</h2>
                                <div className="mt-5 space-y-5">
                                    {detailGroups.map(({ id, title, Icon, fields }) => (
                                        <div key={id}>
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-200">
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <h3 className="text-sm font-black text-light-text dark:text-dark-text">{title}</h3>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                {fields.map(({ field, value }) => (
                                                    <div key={`${id}-${field.key}`} className="min-h-[78px] rounded-2xl border border-light-border bg-white p-3 shadow-sm dark:border-dark-border dark:bg-dark-card">
                                                        <p className="text-[10px] font-black uppercase leading-tight text-light-muted dark:text-dark-muted">{field.label}</p>
                                                        <p className="mt-2 break-words text-sm font-black leading-snug">{formatRoomFieldValue(field, value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="border-b border-light-border pb-8 dark:border-dark-border">
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Amenities</p>
                                    <h2 className="mt-1 text-xl font-black md:text-2xl">What this place offers</h2>
                                </div>
                                <Wifi className="hidden h-8 w-8 text-light-muted/40 sm:block" />
                            </div>
                            <AmenitiesList facilities={room.facilities} />
                        </section>

                        <section className="border-b border-light-border pb-8 dark:border-dark-border">
                            <h2 className="text-xl font-black md:text-2xl">House rules</h2>
                            {visibleRules.length ? (
                                <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
                                    {visibleRules.map(({ field, value }) => (
                                        <div key={field.key} className="min-h-[78px] rounded-2xl border border-light-border bg-white p-3 dark:border-dark-border dark:bg-dark-card sm:p-4">
                                            <p className="text-[10px] font-black uppercase leading-tight text-light-muted dark:text-dark-muted sm:text-[11px]">{field.label}</p>
                                            <p className="mt-2 break-words text-sm font-black leading-snug">
                                                {field.type === 'boolean' ? 'Yes' : formatRoomFieldValue(field, value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm font-semibold text-light-muted dark:text-dark-muted">No specific rules have been added yet.</p>
                            )}
                        </section>

                        {mapCoordinates && (
                            <section className="border-b border-light-border pb-8 dark:border-dark-border">
                                <h2 className="text-xl font-black md:text-2xl">Location</h2>
                                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-light-muted dark:text-dark-muted">
                                    <MapPin className="h-4 w-4 text-cyan-500" />
                                    {address}
                                </p>
                                <div className="relative z-0 mt-5 isolate overflow-hidden rounded-3xl border border-light-border dark:border-dark-border">
                                    <Suspense fallback={<div className="h-80 w-full bg-light-card dark:bg-dark-card" />}>
                                        <RoomLocationMap coordinates={mapCoordinates} title={displayTitle} />
                                    </Suspense>
                                </div>
                                <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-800/40 dark:bg-cyan-900/20">
                                    <div className="grid grid-cols-2 items-center gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-black">Search nearby rooms</p>
                                            <p className="mt-1 text-xs font-semibold text-light-muted dark:text-dark-muted">Find verified rooms within {searchRadius} km of this listing.</p>
                                        </div>
                                        <Link to={nearbySearchUrl} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-white transition hover:bg-cyan-600">
                                            Search radius
                                        </Link>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="25"
                                        value={searchRadius}
                                        onChange={(event) => setSearchRadius(Number(event.target.value))}
                                        className="mt-4 w-full accent-cyan-500"
                                    />
                                </div>
                            </section>
                        )}

                        <section className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">
                            {[
                                { title: 'Fast host replies', text: room.responseRate === null || room.responseRate === undefined ? 'Response data builds from real requests' : `${room.responseRate}% response rate`, Icon: MessageCircle },
                                { title: 'Move-in clarity', text: minimumStayText, Icon: Clock3 },
                                { title: 'Safer booking', text: 'Confirm only after host approval', Icon: ShieldCheck },
                            ].map(({ title, text, Icon }) => (
                                <div key={title} className="rounded-2xl border border-light-border bg-white p-3 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-5">
                                    <Icon className="h-5 w-5 text-cyan-500 sm:h-6 sm:w-6" />
                                    <h3 className="mt-3 text-sm font-black leading-tight sm:mt-4 sm:text-base">{title}</h3>
                                    <p className="mt-2 text-xs font-semibold leading-5 text-light-muted dark:text-dark-muted sm:text-sm sm:leading-6">{text}</p>
                                </div>
                            ))}
                        </section>

                        <section id="reviews" className="border-b border-light-border pb-8 dark:border-dark-border">
                            {sentiment?.reviewCount > 0 && (
                                <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">AI review sentiment</p>
                                    <p className="mt-1 text-2xl font-black">{sentiment.positivePercentage}% Positive</p>
                                    {sentiment.summary && <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-100">{sentiment.summary}</p>}
                                </div>
                            )}
                            <ReviewsSection reviews={reviews} averageRating={room.averageRating} numReviews={room.numReviews} ratingBreakdown={room.ratingBreakdown} />
                        </section>
                    </div>

                    <aside className="hidden lg:block">
                        <div className="sticky top-20">
                            <BookingPanel room={room} onContactLandlord={handleContactLandlord} />
                        </div>
                    </aside>
                </div>

                <section className="mt-14 border-t border-light-border pt-10 dark:border-dark-border">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Similar rooms</p>
                            <h2 className="mt-1 text-xl font-black md:text-2xl">Nearby first, then this host</h2>
                            <p className="mt-1 max-w-xl text-sm font-semibold leading-6 text-light-muted dark:text-dark-muted">
                                Sorted by city, distance, price, room type, amenities, and host quality.
                            </p>
                        </div>
                        {room.location?.city && (
                            <Link to={`/rooms?city=${encodeURIComponent(room.location.city)}`} className="hidden items-center gap-1 text-sm font-black text-cyan-600 hover:text-cyan-700 dark:text-cyan-300 sm:inline-flex">
                                View all in {room.location.city}
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>
                    {similarRooms.length ? (
                        <div className="flex gap-3 overflow-x-auto pb-4 [scrollbar-width:none] md:grid md:grid-cols-4 md:gap-4 md:overflow-visible [&::-webkit-scrollbar]:hidden">
                            {similarRooms.map((similarRoom, index) => (
                                <div key={similarRoom._id} className="min-w-[232px] sm:min-w-[252px] md:min-w-0">
                                    {similarRoom._recommendation?.reason && (
                                        <div className="mb-2 inline-flex max-w-full rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                                            <span className="truncate">{similarRoom._recommendation.reason}</span>
                                        </div>
                                    )}
                                    <RoomCard room={similarRoom} compact position={index + 1} trackingContext="similar_rooms" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-light-border bg-white p-8 text-center dark:border-dark-border dark:bg-dark-card">
                            <p className="font-black">No similar rooms available yet.</p>
                            <p className="mt-2 text-sm font-semibold text-light-muted dark:text-dark-muted">Published rooms from the same city or price range will appear here.</p>
                        </div>
                    )}
                </section>
            </main>

            <div className={`fixed bottom-[calc(var(--rr-bottom-nav-height)+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-y border-light-border bg-white/95 px-3 py-2.5 shadow-[0_-10px_30px_-22px_rgba(15,17,23,0.45)] backdrop-blur-xl transition duration-200 dark:border-dark-border dark:bg-dark-sidebar/95 lg:hidden ${showMobileBookingBar ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-lg font-black leading-tight">{money(room.rent)}</p>
                        <p className="text-[11px] font-semibold text-light-muted dark:text-dark-muted">per month</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
                        !isBookable
                            ? 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                    }`}>
                        {!isBookable
                            ? (isBooked
                                ? (availableLabel !== 'Available now' ? `Next move-in ${availableLabel}` : 'Currently booked')
                                : 'Not accepting requests')
                            : 'Platform protection included'}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={handleRequestToBook}
                        disabled={!isBookable}
                        className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl bg-brand px-2 text-[12px] font-black text-white shadow-lg shadow-brand/30 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-slate-400 sm:text-sm"
                    >
                        <Sparkles className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{isBooked ? 'Already booked' : isBookable ? 'Request to book' : 'Not available'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleContactLandlord}
                        className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-light-border bg-white px-2 text-[12px] font-black text-light-text transition hover:bg-light-card dark:border-dark-border dark:bg-dark-card dark:text-dark-text sm:text-sm"
                    >
                        <MessageCircle className="h-4 w-4 flex-shrink-0 text-cyan-500" />
                        <span className="truncate">Contact landlord</span>
                    </button>
                </div>
            </div>

            {isInquiryModalOpen && (
                <InquiryModal room={room} onClose={() => setIsInquiryModalOpen(false)} />
            )}
            <SupportTicketModal
                open={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                defaultCategory="listing"
                defaultPriority="high"
                defaultSubject="Report suspicious or inaccurate room listing"
                defaultMessage={`I want to report this room listing.\n\nRoom: ${displayTitle}\nIssue details:\n`}
                context={{
                    scope: 'travelling',
                    path: location.pathname,
                    roomId: room._id,
                    roomTitle: displayTitle,
                }}
            />

        </div>
    );
};

export default RoomDetailsPage;
