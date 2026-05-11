import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import toast from 'react-hot-toast';
import api from '../../api';
import Spinner from '../../components/common/Spinner';
import ImageGallery from '../../components/features/rooms/ImageGallery';
import BookingPanel from '../../components/features/booking/BookingPanel';
import AmenitiesList from '../../components/features/rooms/AmenitiesList';
import ReviewsSection from '../../components/features/rooms/ReviewsSection';
import InquiryModal from '../../components/features/chat/InquiryModal';
import RoomCard from '../../components/features/rooms/RoomCard';
import { useAuth } from '../../context/AuthContext';
import { formatRoomFieldValue, getRulesSection, getRoomFieldValue, getVisibleDetailFields } from '../../utils/roomFieldUtils';
import {
    ArrowLeft,
    BadgeCheck,
    BedDouble,
    CalendarCheck,
    ChevronRight,
    Clock3,
    Heart,
    Home,
    MapPin,
    MessageCircle,
    Share2,
    ShieldCheck,
    Sparkles,
    Star,
    Users,
    Wifi,
} from 'lucide-react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

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

const Avatar = ({ user }) => (
    <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-xl font-black text-white shadow-sm dark:bg-white dark:text-slate-950">
        {user?.avatarUrl || user?.profilePicture ? (
            <img src={user.avatarUrl || user.profilePicture} alt={user.name || 'Host'} className="h-full w-full object-cover" />
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
    const { user, addToWishlist, removeFromWishlist } = useAuth();
    const [room, setRoom] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [similarRooms, setSimilarRooms] = useState([]);
    const [sentiment, setSentiment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
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
                setReviews(reviewsRes.data.data || reviewsRes.data || []);
                setSentiment(sentimentRes.data || null);

                try {
                    const { data } = await api.get(`/rooms/similar/${roomId}`);
                    setSimilarRooms(data.data || data || []);
                } catch {
                    if (roomData.location?.city) {
                        const { data } = await api.get(`/rooms?city=${encodeURIComponent(roomData.location.city)}&limit=8&exclude=${roomId}`);
                        setSimilarRooms(data.data || data || []);
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

    const images = useMemo(() => {
        if (!room) return [];
        const source = Array.isArray(room.images) && room.images.length
            ? room.images
            : Array.isArray(room.imageUrls) && room.imageUrls.length
                ? room.imageUrls
                : [room.imageUrl].filter(Boolean);
        return source.map(getImageUrl).filter(Boolean);
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
    const configDetailFields = getVisibleDetailFields(room)
        .filter(({ field }) => !['title', 'description', 'fullAddress'].includes(field.key));
    const rulesSection = getRulesSection();
    const visibleRules = rulesSection.fields
        .map((field) => ({ field, value: getRoomFieldValue(room, { ...field, sectionId: 'rules' }) }))
        .filter(({ value }) => value !== undefined && value !== null && value !== '' && value !== false);
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

    const handleShare = async () => {
        const url = `${window.location.origin}/room/${room._id}`;
        if (navigator.share) {
            await navigator.share({ title: room.title, text: `View ${room.title} on RoomRadar`, url });
            return;
        }
        await navigator.clipboard.writeText(url);
        toast.success('Room link copied.');
    };

    const handleWishlist = async () => {
        if (!user) {
            toast.error('Please log in to use wishlist.');
            return;
        }
        if (isWishlisted) {
            await removeFromWishlist(room._id);
            toast.success('Removed from wishlist.');
        } else {
            await addToWishlist(room._id);
            toast.success('Added to wishlist.');
        }
    };

    return (
        <div className="min-h-screen bg-light-bg pb-28 text-light-text dark:bg-dark-bg dark:text-dark-text lg:pb-0">
            <div className="sticky top-0 z-40 border-b border-light-border bg-white/90 backdrop-blur-xl dark:border-dark-border dark:bg-dark-sidebar/90">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-8">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-light-muted transition hover:bg-light-bg hover:text-cyan-600 dark:text-dark-muted dark:hover:bg-dark-input dark:hover:text-cyan-300"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden md:inline">Back</span>
                    </button>

                    <p className="hidden max-w-sm truncate text-sm font-black md:block">{room.title}</p>

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
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
                <section className="mb-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Available now
                        </span>
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                            Verified listing
                        </span>
                        {room.createdAt && Date.now() - new Date(room.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30 && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                New listing
                            </span>
                        )}
                    </div>
                    <h1 className="max-w-4xl text-2xl font-black tracking-tight text-light-text dark:text-dark-text md:text-4xl">
                        {room.title}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-light-muted dark:text-dark-muted">
                        {rating > 0 && (
                            <span className="inline-flex items-center gap-1 font-black text-light-text dark:text-dark-text">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                {rating.toFixed(1)}
                                <span className="font-semibold text-light-muted dark:text-dark-muted">({reviewCount} reviews)</span>
                            </span>
                        )}
                        {rating > 0 && <span>·</span>}
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-cyan-500" />
                            {room.location?.city || 'City'}, {room.location?.state || 'India'}
                        </span>
                    </div>
                </section>

                <section className="mb-10 overflow-hidden rounded-3xl border border-light-border bg-white p-2 shadow-xl shadow-slate-950/5 dark:border-dark-border dark:bg-dark-card dark:shadow-black/20">
                    <ImageGallery images={images} />
                </section>

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
                    <div className="min-w-0 space-y-10">
                        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {factsForRoom(room).map(({ label, value, Icon }) => (
                                <div key={label} className="rounded-2xl border border-light-border bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-card">
                                    <Icon className="h-5 w-5 text-cyan-500" />
                                    <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">{label}</p>
                                    <p className="mt-1 truncate text-sm font-black">{value}</p>
                                </div>
                            ))}
                        </section>

                        <section className="border-b border-light-border pb-8 dark:border-dark-border">
                            <div className="flex items-center gap-4">
                                <Avatar user={room.landlord} />
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-xl font-black md:text-2xl">Hosted by {room.landlord?.name || 'RoomRadar host'}</h2>
                                    <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">
                                        {hostSince ? `Member since ${hostSince}` : 'Verified RoomRadar host'}
                                        {room.responseRate !== null && room.responseRate !== undefined ? ` · ${room.responseRate}% response rate` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsInquiryModalOpen(true)}
                                    className="hidden rounded-xl border border-light-border px-4 py-2 text-sm font-black transition hover:bg-light-card dark:border-dark-border dark:hover:bg-dark-card sm:inline-flex"
                                >
                                    Message host
                                </button>
                                <BadgeCheck className="hidden h-6 w-6 flex-shrink-0 text-cyan-500 md:block" />
                            </div>
                        </section>

                        <section className="border-b border-light-border pb-8 dark:border-dark-border">
                            <h2 className="text-xl font-black md:text-2xl">About this place</h2>
                            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-light-muted dark:text-dark-muted">
                                {room.description || 'A thoughtfully listed room with the essentials room seekers and professionals need for a comfortable stay.'}
                            </p>
                        </section>

                        {configDetailFields.length > 0 && (
                            <section className="border-b border-light-border pb-8 dark:border-dark-border">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">RoomRadar config</p>
                                <h2 className="mt-1 text-xl font-black md:text-2xl">Listing details</h2>
                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    {configDetailFields.map(({ field, value }) => (
                                        <div key={field.key} className="rounded-2xl border border-light-border bg-white p-4 dark:border-dark-border dark:bg-dark-card">
                                            <p className="text-[11px] font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">{field.label}</p>
                                            <p className="mt-1 text-sm font-black">{formatRoomFieldValue(field, value)}</p>
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
                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    {visibleRules.map(({ field, value }) => (
                                        <div key={field.key} className="rounded-2xl border border-light-border bg-white p-4 dark:border-dark-border dark:bg-dark-card">
                                            <p className="text-[11px] font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">{field.label}</p>
                                            <p className="mt-1 text-sm font-black">{formatRoomFieldValue(field, value)}</p>
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
                                <div className="mt-5 overflow-hidden rounded-3xl border border-light-border dark:border-dark-border">
                                    <MapContainer center={mapCoordinates} zoom={14} className="h-80 w-full">
                                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Marker position={mapCoordinates}>
                                            <Popup>{room.title}</Popup>
                                        </Marker>
                                    </MapContainer>
                                </div>
                                <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-800/40 dark:bg-cyan-900/20">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
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

                        <section className="grid gap-4 md:grid-cols-3">
                            {[
                                { title: 'Fast host replies', text: room.responseRate === null || room.responseRate === undefined ? 'Response data builds from real requests' : `${room.responseRate}% response rate`, Icon: MessageCircle },
                                { title: 'Move-in clarity', text: room.minimumStay?.value ? `Minimum ${room.minimumStay.value} ${room.minimumStay.unit || 'days'}` : 'Flexible stay terms', Icon: Clock3 },
                                { title: 'Safer booking', text: 'Confirm only after host approval', Icon: ShieldCheck },
                            ].map(({ title, text, Icon }) => (
                                <div key={title} className="rounded-2xl border border-light-border bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-card">
                                    <Icon className="h-6 w-6 text-cyan-500" />
                                    <h3 className="mt-4 text-base font-black">{title}</h3>
                                    <p className="mt-2 text-sm font-semibold leading-6 text-light-muted dark:text-dark-muted">{text}</p>
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
                            <ReviewsSection reviews={reviews} averageRating={room.averageRating} numReviews={room.numReviews} />
                        </section>
                    </div>

                    <aside className="hidden lg:block">
                        <div className="sticky top-20">
                            <BookingPanel room={room} onContactLandlord={() => setIsInquiryModalOpen(true)} />
                        </div>
                    </aside>
                </div>

                <section className="mt-14 border-t border-light-border pt-10 dark:border-dark-border">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Similar rooms</p>
                            <h2 className="mt-1 text-2xl font-black">More nearby options</h2>
                        </div>
                        {room.location?.city && (
                            <Link to={`/rooms?city=${encodeURIComponent(room.location.city)}`} className="hidden items-center gap-1 text-sm font-black text-cyan-600 hover:text-cyan-700 dark:text-cyan-300 sm:inline-flex">
                                View all in {room.location.city}
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>
                    {similarRooms.length ? (
                        <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] md:grid md:grid-cols-4 md:overflow-visible [&::-webkit-scrollbar]:hidden">
                            {similarRooms.map((similarRoom) => (
                                <div key={similarRoom._id} className="min-w-[260px] md:min-w-0">
                                    <RoomCard room={similarRoom} />
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

            <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t border-light-border bg-white/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-10px_30px_-22px_rgba(15,17,23,0.45)] backdrop-blur-xl dark:border-dark-border dark:bg-dark-sidebar/95 lg:hidden">
                <div className="min-w-0">
                    <p className="text-xl font-black">{money(room.rent)}</p>
                    <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">per month</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(`/room/${room._id}/book`)}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-black text-white shadow-lg shadow-brand/30 transition active:scale-[0.97]"
                >
                    <Sparkles className="h-4 w-4" />
                    Request
                </button>
                <button
                    type="button"
                    onClick={() => setIsInquiryModalOpen(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-light-border bg-white transition hover:bg-light-card dark:border-dark-border dark:bg-dark-card"
                    aria-label="Send inquiry"
                >
                    <MessageCircle className="h-5 w-5" />
                </button>
            </div>

            {isInquiryModalOpen && (
                <InquiryModal room={room} onClose={() => setIsInquiryModalOpen(false)} />
            )}
        </div>
    );
};

export default RoomDetailsPage;
