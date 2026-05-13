import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Award,
    Bath,
    CalendarDays,
    Car,
    BedDouble,
    ChevronLeft,
    ChevronRight,
    Heart,
    Home,
    MapPin,
    ReceiptText,
    ShieldCheck,
    Sofa,
    Star,
    Trash2,
    Utensils,
    User,
    Users,
    Users2,
    WalletCards,
    Wifi,
    Wind,
    Zap,
    ImageOff,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useAuth } from '../../../context/AuthContext';
import { formatListingTitle } from '../../../utils/listingDisplay';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;
const DAY_MS = 24 * 60 * 60 * 1000;

const compactMoney = (value) => {
    const amount = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(amount) || amount < 0) return '';
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
    if (amount >= 1000) return `\u20B9${Math.round(amount / 1000)}k`;
    return `\u20B9${amount.toLocaleString('en-IN')}`;
};

const normalizeRoomTypeLabel = (type = '') => {
    const value = String(type || '').trim();
    if (!value) return 'Room type';
    const bhkMatch = value.match(/^(\d)\s*BHK$/i);
    if (bhkMatch) return `${bhkMatch[1]} BHK`;
    if (/^1rk$/i.test(value)) return '1 RK';
    if (/pg/i.test(value)) return 'PG stay';
    return value
        .replace(/\broom\b/i, 'room')
        .replace(/\bflat\b/i, 'flat')
        .replace(/\bbhk\b/i, 'BHK')
        .replace(/\brk\b/i, 'RK');
};

const normalizeFamilyStatus = (room = {}) => (
    room.tenantPreferences?.familyStatus
    || room.familyStatus
    || ''
);

const normalizeAllowedGender = (room = {}) => (
    room.tenantPreferences?.allowedGender
    || room.tenantPreferences?.gender
    || room.gender
    || ''
);

const getTenantLabel = (room = {}) => {
    const familyStatus = normalizeFamilyStatus(room);
    const allowedGender = normalizeAllowedGender(room);
    if (allowedGender === 'Female') return 'Women only';
    if (allowedGender === 'Male') return 'Men only';
    if (familyStatus === 'Family' || familyStatus === 'Family Only') return 'Family only';
    if (familyStatus === 'Bachelors' || familyStatus === 'Bachelors Only') return 'Bachelors only';
    return '';
};

const getWashroomLabel = (room = {}) => {
    const washroomType = room.washroomType || (room.attachedWashroom || room.facilities?.attachedWashroom ? 'Attached' : '');
    if (/attached/i.test(washroomType)) return 'Attached bath';
    if (/shared/i.test(washroomType)) return 'Shared bath';
    if (/common/i.test(washroomType)) return 'Common bath';
    return '';
};

const getMoveInLabel = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date <= today) return 'Available now';
    return `Move-in ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
};

const getElectricityLabel = (value = '') => {
    if (/included/i.test(value)) return 'Electricity included';
    if (/metered/i.test(value)) return 'Metered electricity';
    if (/fixed/i.test(value)) return 'Fixed electricity';
    if (/not included/i.test(value)) return 'Electricity extra';
    return '';
};

const getDistanceLabel = (value) => {
    const distance = Number(value);
    if (!Number.isFinite(distance) || distance <= 0) return '';
    if (distance < 1) return `${Math.max(100, Math.round(distance * 1000))} m away`;
    return `${distance.toFixed(distance < 10 ? 1 : 0)} km away`;
};

const getCompactTagText = (key = '', text = '') => {
    const value = String(text || '').trim();
    if (!value) return '';

    if (key === 'tenant') {
        if (/women/i.test(value)) return 'Women';
        if (/men/i.test(value)) return 'Men';
        if (/family/i.test(value)) return 'Family';
        if (/bachelor/i.test(value)) return 'Bachelor';
    }

    if (key === 'room-type') {
        const bhkMatch = value.match(/(\d+)\s*BHK/i);
        if (bhkMatch) return `${bhkMatch[1]} BHK`;
        if (/shared/i.test(value)) return 'Shared';
        if (/single/i.test(value)) return 'Single';
        if (/pg/i.test(value)) return 'PG';
        return value.replace(/\s*\([^)]*\)/g, '').replace(/\s+room\b/i, '').trim();
    }

    if (key === 'category') return value.replace(/^Co-living$/i, 'Co-live');
    if (key === 'instant') return 'Instant';
    if (key === 'washroom') return /attached/i.test(value) ? 'Bath' : value.replace(/\s+bath/i, '');
    if (key === 'deposit') return value.replace(/^Deposit/i, 'Dep');
    if (key === 'electricity') return /included/i.test(value) ? 'Electricity' : 'Metered';
    if (key === 'available') return value.replace(/^Move-in\s+/i, '');
    if (key === 'distance') return value.replace(/\s+away$/i, '');
    if (key === 'occupancy') return value.replace(/^Up to\s+/i, '').replace(/\s+people$/i, ' guests');
    if (key === 'beds') return value.replace(/\s+beds?/i, ' bed');
    if (key === 'wifi') return 'WiFi';
    if (key === 'ac') return 'AC';
    if (key === 'powerBackup') return 'Power';
    if (key === 'security') return 'Security';
    if (key === 'payment') return /offline/i.test(value) ? 'Offline pay' : 'Online pay';

    return value.length > 12 ? `${value.slice(0, 11).trim()}...` : value;
};

const pushUniqueTag = (tags, tag) => {
    if (!tag?.text) return;
    const key = tag.key || tag.text.toLowerCase();
    if (tags.some((item) => (item.key || item.text.toLowerCase()) === key)) return;
    tags.push({ ...tag, key });
};

const getImageUrl = (image) => {
    if (!image) return '';
    if (typeof image === 'string') return image.trim();
    return String(image.url || image.secure_url || image.imageUrl || '').trim();
};

const normalizeStatusLabel = (status = '') => {
    const value = String(status || '').replace(/_/g, ' ').trim();
    if (!value) return '';
    return value
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
};

const getRealLocationLabel = (room = {}) => {
    const location = room.location || {};
    const parts = [
        location.locality,
        location.landmark,
        location.city || room.city,
        location.state,
        location.pincode || location.postalCode,
    ]
        .map((item) => String(item || '').trim())
        .filter(Boolean);

    return [...new Set(parts)].join(', ');
};

const isRecentListing = (createdAt) => {
    if (!createdAt) return false;
    const createdDate = new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) return false;
    return Date.now() - createdDate.getTime() <= 14 * DAY_MS;
};

const supportsFineHover = () => (
    typeof window !== 'undefined'
    && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
);

const IMAGE_AUTO_ADVANCE_MS = 3600;
const MOBILE_IMAGE_AUTO_ADVANCE_MS = 2200;
const ACTIVE_PREVIEW_EVENT = 'roomradar:active-room-card-preview';
const mobilePreviewRegistry = new Map();
let activeMobilePreviewId = null;
let previewSyncFrame = null;
let previewListenerCount = 0;
let lastMobileTouchPoint = null;

const getVisibleRatio = (rect) => {
    if (!rect.height || rect.bottom <= 0 || rect.top >= window.innerHeight) return 0;
    const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    return Math.max(0, Math.min(1, visibleHeight / rect.height));
};

const syncActiveMobilePreview = () => {
    previewSyncFrame = null;
    if (typeof window === 'undefined') return;
    if (supportsFineHover()) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const touchPoint = lastMobileTouchPoint && now - lastMobileTouchPoint.time < 900
        ? lastMobileTouchPoint
        : null;
    const viewportFocusY = touchPoint?.y ?? window.innerHeight * 0.48;
    let nextActiveId = null;
    let nextScore = -Infinity;

    mobilePreviewRegistry.forEach((entry, id) => {
        const node = entry?.cardNode || entry;
        if (!node?.isConnected) return;
        const rect = node.getBoundingClientRect();
        const visibleRatio = getVisibleRatio(rect);
        if (visibleRatio < 0.45) return;

        const centerY = rect.top + rect.height / 2;
        const centerX = rect.left + rect.width / 2;
        const containsTouch = touchPoint
            && touchPoint.x >= rect.left - 12
            && touchPoint.x <= rect.right + 12
            && touchPoint.y >= rect.top - 12
            && touchPoint.y <= rect.bottom + 12;
        const touchDistance = touchPoint
            ? Math.hypot(centerX - touchPoint.x, centerY - touchPoint.y)
            : 0;
        const score = containsTouch
            ? 20000 + (visibleRatio * 1000) - touchDistance * 0.18
            : (visibleRatio * 1000)
                - Math.abs(centerY - viewportFocusY)
                - Math.abs(centerX - (touchPoint?.x ?? window.innerWidth / 2)) * 0.08;

        if (score > nextScore) {
            nextScore = score;
            nextActiveId = id;
        }
    });

    if (nextActiveId === activeMobilePreviewId) return;
    activeMobilePreviewId = nextActiveId;
    window.dispatchEvent(new CustomEvent(ACTIVE_PREVIEW_EVENT, { detail: { id: activeMobilePreviewId } }));
};

const scheduleActiveMobilePreviewSync = () => {
    if (typeof window === 'undefined' || previewSyncFrame) return;
    previewSyncFrame = window.requestAnimationFrame(syncActiveMobilePreview);
};

const ensureMobilePreviewListeners = () => {
    if (typeof window === 'undefined') return;
    previewListenerCount += 1;
    if (previewListenerCount > 1) return;
    document.addEventListener('touchstart', handleMobilePreviewTouch, { passive: true, capture: true });
    document.addEventListener('touchmove', handleMobilePreviewTouch, { passive: true, capture: true });
    document.addEventListener('touchend', handleMobilePreviewTouchEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', handleMobilePreviewTouchEnd, { passive: true, capture: true });
    window.addEventListener('scroll', scheduleActiveMobilePreviewSync, { passive: true });
    window.addEventListener('resize', scheduleActiveMobilePreviewSync);
    window.addEventListener('orientationchange', scheduleActiveMobilePreviewSync);
    document.addEventListener('scroll', scheduleActiveMobilePreviewSync, true);
};

const releaseMobilePreviewListeners = () => {
    if (typeof window === 'undefined') return;
    previewListenerCount = Math.max(0, previewListenerCount - 1);
    if (previewListenerCount > 0) return;
    document.removeEventListener('touchstart', handleMobilePreviewTouch, true);
    document.removeEventListener('touchmove', handleMobilePreviewTouch, true);
    document.removeEventListener('touchend', handleMobilePreviewTouchEnd, true);
    document.removeEventListener('touchcancel', handleMobilePreviewTouchEnd, true);
    window.removeEventListener('scroll', scheduleActiveMobilePreviewSync);
    window.removeEventListener('resize', scheduleActiveMobilePreviewSync);
    window.removeEventListener('orientationchange', scheduleActiveMobilePreviewSync);
    document.removeEventListener('scroll', scheduleActiveMobilePreviewSync, true);
    if (previewSyncFrame) {
        window.cancelAnimationFrame(previewSyncFrame);
        previewSyncFrame = null;
    }
    activeMobilePreviewId = null;
    lastMobileTouchPoint = null;
};

const handleMobilePreviewTouch = (event) => {
    if (typeof window === 'undefined' || supportsFineHover()) return;
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!touch) return;
    lastMobileTouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    };
    scheduleActiveMobilePreviewSync();
};

const handleMobilePreviewTouchEnd = (event) => {
    handleMobilePreviewTouch(event);
    if (typeof window === 'undefined') return;
    window.setTimeout(scheduleActiveMobilePreviewSync, 220);
};

function RoomCard({ room, context = 'default', onRemove, imagePriority = false }) {
    const { user, addToWishlist, removeFromWishlist } = useAuth();
    const cardRoom = room || {};
    const roomId = cardRoom._id;
    const imageUrls = useMemo(() => (
        (Array.isArray(cardRoom.images) && cardRoom.images.length > 0
            ? cardRoom.images
            : Array.isArray(cardRoom.imageUrls) && cardRoom.imageUrls.length > 0
                ? cardRoom.imageUrls
                : [cardRoom.imageUrl])
            .map(getImageUrl)
            .filter(Boolean)
    ), [cardRoom.imageUrl, cardRoom.imageUrls, cardRoom.images]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isMediaVisible, setIsMediaVisible] = useState(false);
    const [isActiveMobilePreview, setIsActiveMobilePreview] = useState(false);
    const cardRef = useRef(null);
    const mediaRef = useRef(null);
    const previewIdRef = useRef(null);
    if (!previewIdRef.current) {
        previewIdRef.current = `${roomId || 'room'}-${Math.random().toString(36).slice(2)}`;
    }
    const canPreviewOnHover = useMemo(supportsFineHover, []);
    const isSavedContext = context === 'saved';
    const isWishlisted = Boolean(user?.wishlist?.some((item) => String(item?._id || item) === String(roomId)));
    const rating = cardRoom.averageRating || cardRoom.rating;
    const isGuestFavourite = Number(rating || 0) >= 4.8;
    const handleWishlistClick = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isSavedContext && onRemove) {
            onRemove(roomId);
            return;
        }
        if (!user) return;
        if (isWishlisted) removeFromWishlist(roomId);
        else addToWishlist(roomId);
    }, [addToWishlist, isSavedContext, isWishlisted, onRemove, removeFromWishlist, roomId, user]);

    const handleNextImage = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imageUrls.length);
    }, [imageUrls.length]);

    const handlePrevImage = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setCurrentImageIndex((prevIndex) => (prevIndex - 1 + imageUrls.length) % imageUrls.length);
    }, [imageUrls.length]);

    const handleMouseEnter = useCallback(() => {
        if (canPreviewOnHover) setIsHovered(true);
    }, [canPreviewOnHover]);

    const handleMouseLeave = useCallback(() => {
        if (canPreviewOnHover) setIsHovered(false);
    }, [canPreviewOnHover]);

    useEffect(() => {
        setCurrentImageIndex(0);
    }, [imageUrls.length]);

    useEffect(() => {
        const mediaNode = mediaRef.current;
        if (!mediaNode || imageUrls.length <= 1 || typeof IntersectionObserver === 'undefined') {
            setIsMediaVisible(true);
            return undefined;
        }

        const observer = new IntersectionObserver(
            ([entry]) => setIsMediaVisible(entry.isIntersecting && entry.intersectionRatio > 0.35),
            { threshold: [0, 0.35, 0.7] }
        );

        observer.observe(mediaNode);
        return () => observer.disconnect();
    }, [imageUrls.length]);

    useEffect(() => {
        if (canPreviewOnHover || imageUrls.length <= 1 || typeof window === 'undefined') {
            setIsActiveMobilePreview(false);
            return undefined;
        }

        const previewId = previewIdRef.current;
        const mediaNode = mediaRef.current;
        const cardNode = cardRef.current;
        if (!previewId || !mediaNode || !cardNode) return undefined;

        mobilePreviewRegistry.set(previewId, { cardNode, mediaNode });
        ensureMobilePreviewListeners();

        const handleActivePreviewChange = (event) => {
            setIsActiveMobilePreview(event.detail?.id === previewId);
        };

        window.addEventListener(ACTIVE_PREVIEW_EVENT, handleActivePreviewChange);
        scheduleActiveMobilePreviewSync();

        return () => {
            mobilePreviewRegistry.delete(previewId);
            window.removeEventListener(ACTIVE_PREVIEW_EVENT, handleActivePreviewChange);
            if (activeMobilePreviewId === previewId) {
                activeMobilePreviewId = null;
                scheduleActiveMobilePreviewSync();
            }
            releaseMobilePreviewListeners();
            setIsActiveMobilePreview(false);
        };
    }, [canPreviewOnHover, imageUrls.length]);

    const shouldAutoAdvanceImages = imageUrls.length > 1
        && isMediaVisible
        && (canPreviewOnHover ? isHovered : isActiveMobilePreview);
    const activeSlideDuration = canPreviewOnHover ? IMAGE_AUTO_ADVANCE_MS : MOBILE_IMAGE_AUTO_ADVANCE_MS;

    useEffect(() => {
        if (!shouldAutoAdvanceImages) return undefined;
        if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

        const previewTimer = window.setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imageUrls.length);
        }, activeSlideDuration);

        return () => window.clearInterval(previewTimer);
    }, [activeSlideDuration, imageUrls.length, shouldAutoAdvanceImages]);

    const imageLoading = imagePriority ? 'eager' : 'lazy';
    const imageFetchPriority = imagePriority ? 'high' : 'auto';
    const indicatorCount = Math.min(imageUrls.length, 5);
    const activeIndicatorIndex = indicatorCount > 0 ? currentImageIndex % indicatorCount : 0;
    const detailTags = useMemo(() => {
        const tags = [];
        const facilities = cardRoom.facilities || {};
        const tenantLabel = getTenantLabel(cardRoom);
        const washroomLabel = getWashroomLabel(cardRoom);
        const depositAmount = Number(String(cardRoom.securityDeposit ?? '').replace(/[^\d.-]/g, ''));
        const moveInLabel = getMoveInLabel(cardRoom.availableFrom);
        const electricityLabel = getElectricityLabel(cardRoom.electricityBilling);
        const distanceLabel = getDistanceLabel(cardRoom._match?.distanceKm ?? cardRoom._recommendation?.distanceKm);
        const roomTypeLabel = cardRoom.roomType
            ? normalizeRoomTypeLabel(cardRoom.roomType)
            : '';
        const listingCategory = String(cardRoom.listingCategory || '').trim();
        const shouldShowCategory = listingCategory
            && !['Room', 'Other'].includes(listingCategory)
            && !String(roomTypeLabel || '').toLowerCase().includes(listingCategory.toLowerCase());

        pushUniqueTag(tags, distanceLabel && { key: 'distance', Icon: MapPin, text: distanceLabel, tone: 'accent' });
        pushUniqueTag(tags, shouldShowCategory && { key: 'category', Icon: Award, text: listingCategory, tone: 'accent' });
        pushUniqueTag(tags, roomTypeLabel && { key: 'room-type', Icon: Home, text: roomTypeLabel, tone: 'accent' });
        pushUniqueTag(tags, tenantLabel && {
            key: 'tenant',
            Icon: tenantLabel.includes('Women') || tenantLabel.includes('Men') ? User : Users2,
            text: tenantLabel,
            tone: 'accent',
        });
        pushUniqueTag(tags, cardRoom.instantBook && { key: 'instant', Icon: Zap, text: 'Instant book', tone: 'accent' });
        pushUniqueTag(tags, washroomLabel && { key: 'washroom', Icon: Bath, text: washroomLabel, tone: 'accent' });
        pushUniqueTag(tags, facilities.meals && { key: 'meals', Icon: Utensils, text: 'Meals included', tone: 'accent' });
        pushUniqueTag(tags, Number.isFinite(depositAmount) && depositAmount > 0 && {
            key: 'deposit',
            Icon: ReceiptText,
            text: `Deposit ${compactMoney(depositAmount)}`,
            tone: 'muted',
        });
        pushUniqueTag(tags, electricityLabel && { key: 'electricity', Icon: Zap, text: electricityLabel, tone: /included/i.test(electricityLabel) ? 'accent' : 'muted' });
        pushUniqueTag(tags, cardRoom.furnishingStatus && { key: 'furnishing', Icon: Sofa, text: cardRoom.furnishingStatus.replace('Semi Furnished', 'Semi furnished'), tone: 'muted' });
        pushUniqueTag(tags, moveInLabel && { key: 'available', Icon: CalendarDays, text: moveInLabel, tone: 'muted' });
        pushUniqueTag(tags, Number(cardRoom.maxOccupants || 0) > 1 && {
            key: 'occupancy',
            Icon: Users,
            text: `Up to ${cardRoom.maxOccupants} people`,
            tone: 'muted',
        });
        pushUniqueTag(tags, Number(cardRoom.beds || 0) > 0 && {
            key: 'beds',
            Icon: BedDouble,
            text: `${cardRoom.beds} bed${Number(cardRoom.beds) > 1 ? 's' : ''}`,
            tone: 'muted',
        });

        [
            ['wifi', Wifi, 'WiFi included'],
            ['ac', Wind, 'AC room'],
            ['parking', Car, 'Parking'],
            ['powerBackup', Zap, 'Power backup'],
            ['security', ShieldCheck, '24x7 security'],
        ].forEach(([key, Icon, text]) => {
            pushUniqueTag(tags, facilities[key] && { key, Icon, text, tone: 'muted' });
        });

        pushUniqueTag(tags, cardRoom.paymentPreference && {
            key: 'payment',
            Icon: WalletCards,
            text: /offline/i.test(cardRoom.paymentPreference) ? 'Offline pay ok' : 'Online payment',
            tone: 'muted',
        });

        return tags.slice(0, 4);
    }, [cardRoom]);

    const displayTitle = formatListingTitle(cardRoom.title, '');
    const rentAmount = Number(cardRoom.rent);
    const pricePerNight = Number(cardRoom.pricePerNight || 0);
    const pricingMode = String(cardRoom.pricingMode || 'monthly').toLowerCase();
    const displayPriceAmount = pricingMode !== 'monthly' && pricePerNight > 0 ? pricePerNight : rentAmount;
    const priceUnitCompact = pricingMode === 'nightly' ? '/night' : pricingMode === 'daily' ? '/day' : '/mo';
    const priceUnitFull = pricingMode === 'nightly' ? '/night' : pricingMode === 'daily' ? '/day' : '/month';
    const city = String(cardRoom.location?.city || cardRoom.city || '').trim();
    const locationLabel = getRealLocationLabel(cardRoom);
    const statusLabel = normalizeStatusLabel(cardRoom.status);
    const isBookedStatus = ['booked', 'confirmed'].includes(String(cardRoom.status || '').toLowerCase());

    if (!roomId || !displayTitle || !Number.isFinite(rentAmount) || rentAmount <= 0 || !city) return null;

    const landlord = room.landlord && typeof room.landlord === 'object' ? room.landlord : {};
    const landlordProfile = landlord.roleProfiles?.landlord || {};
    const hostName = landlordProfile.name || landlord.name || room.landlordName || '';
    const hostAvatar = landlordProfile.avatarUrl || landlordProfile.profilePicture || landlord.avatarUrl || landlord.profilePicture;
    const hostInitials = hostName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'RR';
    const isVerifiedHost = Boolean(
        landlord.isVerified
        || landlord.kyc_status === 'Verified'
        || ['verified', 'premium'].includes(landlord.verificationLevel)
        || landlord.verifications?.identity
        || landlord.verifications?.property
    );
    const showNewBadge = isRecentListing(cardRoom.createdAt);

    return (
        <article
            ref={cardRef}
            className="room-card-pro rr-room-card group h-full cursor-pointer"
        >
            <Link to={`/room/${room._id}`} className="flex h-full flex-col">
                <div
                    ref={mediaRef}
                    className="rr-room-card-media relative overflow-hidden bg-light-border dark:bg-dark-input"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {imageUrls.length > 0 ? (
                        <>
                            <img
                                key={imageUrls[currentImageIndex]}
                                src={imageUrls[currentImageIndex]}
                                alt={displayTitle}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                                loading={imageLoading}
                                decoding="async"
                                fetchpriority={imageFetchPriority}
                                sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 280px"
                                draggable="false"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/52 via-transparent to-black/10 opacity-80" />
                        </>
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 text-center text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                            <ImageOff className="h-8 w-8" />
                            <span className="mt-2 px-3 text-[11px] font-black uppercase tracking-wide">Photo pending</span>
                        </div>
                    )}

                    {(isBookedStatus || isGuestFavourite || isVerifiedHost || room.verifications?.property) && (
                        <div className="rr-card-badge-stack absolute left-2.5 top-2.5 flex max-w-[70%] flex-col items-start gap-1.5 sm:left-4 sm:top-4">
                            {isBookedStatus && (
                                <span className="rr-card-badge rr-booked-badge">
                                    <span className="rr-card-badge-icon">
                                        <CalendarDays />
                                    </span>
                                    <span className="rr-overlay-label">Booked</span>
                                </span>
                            )}
                            {(isGuestFavourite || isVerifiedHost || room.verifications?.property) && (
                                <span className={`rr-card-badge rr-verify-badge ${isGuestFavourite ? 'is-guest-fav' : ''}`}>
                                    <span className="rr-card-badge-icon">
                                        {isGuestFavourite ? <Award /> : <ShieldCheck />}
                                    </span>
                                    <span className="rr-overlay-label">{isGuestFavourite ? 'Guest fav' : 'Verified'}</span>
                                </span>
                            )}
                        </div>
                    )}

                    <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
                        {showNewBadge && (
                            <span className="rr-card-badge rr-new-badge">
                                <span className="rr-card-badge-icon">
                                    <Star />
                                </span>
                                <span className="rr-new-label">New</span>
                            </span>
                        )}
                        {(user || isSavedContext) && (
                            <button
                                type="button"
                                onClick={handleWishlistClick}
                                className={`rr-card-heart-btn ${isWishlisted || isSavedContext ? 'is-active' : ''}`}
                                aria-label={isSavedContext ? 'Remove saved room' : isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                            >
                                {isSavedContext ? (
                                    <Trash2 />
                                ) : (
                                    <Heart />
                                )}
                            </button>
                        )}
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2 sm:bottom-4 sm:left-4 sm:right-4">
                        <span className={`rr-location-badge ${rating ? 'has-side-badge' : 'is-wide'}`}>
                            <MapPin />
                            <span>{city}</span>
                        </span>
                        {rating && (
                            <span className="rr-rating-badge">
                                <Star />
                                {Number(rating).toFixed(1)}
                            </span>
                        )}
                    </div>

                    {isHovered && imageUrls.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={handlePrevImage}
                                className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:bg-white sm:flex"
                                aria-label="Previous image"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleNextImage}
                                className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:bg-white sm:flex"
                                aria-label="Next image"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    {imageUrls.length > 1 && (
                        <div className="rr-image-progress-strip" style={{ '--rr-slide-duration': `${activeSlideDuration}ms` }}>
                            {imageUrls.slice(0, indicatorCount).map((_, slideIndex) => (
                                <span
                                    key={slideIndex}
                                    className={`rr-image-progress-dot ${shouldAutoAdvanceImages && activeIndicatorIndex === slideIndex ? 'is-active' : ''}`}
                                >
                                    {activeIndicatorIndex === slideIndex && shouldAutoAdvanceImages && (
                                        <span className="rr-image-progress-fill" />
                                    )}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rr-room-card-body flex flex-1 flex-col px-2.5 pb-2.5 pt-2.5 sm:p-5">
                    <div className="min-w-0 flex-1">
                        <div className="rr-card-title-row mb-1.5 min-w-0">
                            <h3 className="rr-room-card-title rr-line-clamp-2 min-w-0 text-[12.5px] font-black leading-[1.18] text-light-text dark:text-dark-text min-[390px]:text-[13.25px] sm:text-[17px] sm:leading-[1.3]">
                                {displayTitle}
                            </h3>
                        </div>
                        <div className="rr-card-price-row mb-1.5 flex min-w-0 items-center justify-between gap-1.5 sm:hidden">
                            <p className="rr-card-price-compact min-w-0">
                                <span className="text-[13.5px] font-black leading-none text-light-text dark:text-dark-text">{money(displayPriceAmount)}</span>
                                <span className="ml-0.5 text-[8.5px] font-bold leading-none text-light-muted dark:text-dark-muted">{priceUnitCompact}</span>
                            </p>
                            {statusLabel && <span className={`rr-card-mini-status ${isBookedStatus ? 'is-booked' : ''}`}>{isBookedStatus ? 'Booked' : statusLabel}</span>}
                        </div>
                        {locationLabel && (
                            <p className="rr-room-card-location mb-2 flex min-w-0 items-start gap-1 text-[9.5px] font-semibold leading-[1.16] text-light-muted dark:text-dark-muted sm:text-[12px]">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
                                <span className="rr-line-clamp-2 min-w-0">{locationLabel}</span>
                            </p>
                        )}
                    </div>

                    {hostName && (
                        <div className="rr-host-inline rr-room-card-host mb-3 min-w-0 items-center gap-2">
                            {hostAvatar ? (
                                <img
                                    src={hostAvatar}
                                    alt={hostName}
                                    className="h-5 w-5 flex-shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-dark-border sm:h-6 sm:w-6"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-[9px] font-bold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 sm:h-6 sm:w-6 sm:text-[10px]">
                                    {hostInitials}
                                </span>
                            )}
                            <span className="min-w-0 truncate text-[11px] font-medium text-light-muted dark:text-dark-muted sm:text-[12px]">
                                Host <span className="font-bold text-light-text dark:text-dark-text">{hostName}</span>
                            </span>
                            <ShieldCheck className={`h-4 w-4 flex-shrink-0 ${isVerifiedHost ? 'text-emerald-600' : 'text-amber-500'}`} />
                        </div>
                    )}

                    {detailTags.length > 0 && (
                        <div className="rr-room-card-tags mb-1.5 grid min-w-0 grid-cols-2 gap-1.5 sm:mb-4 sm:flex sm:flex-wrap sm:gap-2.5">
                            {detailTags.map(({ Icon, text, tone, key: tagKey }, tagIndex) => (
                                <span
                                    key={`${text}-${tagIndex}`}
                                    title={text}
                                    className={`rr-feature-pill inline-flex min-w-0 items-start gap-1 rounded-lg px-1.5 py-1.5 text-[9.5px] font-bold leading-tight sm:px-3 sm:py-2 sm:text-[11px] ${
                                        tone === 'accent'
                                            ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200'
                                            : 'bg-light-bg text-light-muted dark:bg-dark-input dark:text-dark-muted'
                                    } ${tagIndex > 2 ? 'rr-wide-only' : ''}`}
                                >
                                    <Icon className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                                    <span className="rr-feature-label rr-feature-label-full min-w-0">{text}</span>
                                    <span className="rr-feature-label rr-feature-label-compact min-w-0">{getCompactTagText(tagKey, text)}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="rr-room-card-footer mt-auto hidden items-end justify-between gap-3 border-t border-black/[0.08] pt-3 dark:border-white/[0.08] sm:flex sm:gap-4 sm:pt-4">
                        <p className="min-w-0">
                            <span className="rr-room-card-price text-[15px] font-bold leading-none text-light-text dark:text-dark-text min-[390px]:text-base sm:text-lg">
                                {money(displayPriceAmount)}
                            </span>
                            <span className="rr-room-card-price-unit ml-1 text-[11px] font-normal text-light-muted dark:text-dark-muted sm:text-xs">{priceUnitFull}</span>
                        </p>
                        <span className={`rr-room-card-view-btn hidden rounded-full px-3 py-2 text-xs font-bold transition sm:inline-flex ${
                            isBookedStatus
                                ? 'bg-slate-200 text-slate-700 group-hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-200'
                                : 'bg-brand text-white group-hover:bg-red-600'
                        }`}>
                            {isBookedStatus ? 'Booked' : 'View'}
                        </span>
                    </div>
                </div>
            </Link>
        </article>
    );
}

RoomCard.propTypes = {
    context: PropTypes.oneOf(['default', 'saved']),
    imagePriority: PropTypes.bool,
    onRemove: PropTypes.func,
    room: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        imageUrl: PropTypes.string,
        imageUrls: PropTypes.arrayOf(PropTypes.string),
        images: PropTypes.arrayOf(PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({ url: PropTypes.string }),
        ])),
        title: PropTypes.string,
        status: PropTypes.string,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        city: PropTypes.string,
        location: PropTypes.shape({
            locality: PropTypes.string,
            landmark: PropTypes.string,
            city: PropTypes.string,
            state: PropTypes.string,
            pincode: PropTypes.string,
            postalCode: PropTypes.string,
        }),
        rent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        averageRating: PropTypes.number,
        beds: PropTypes.number,
        maxOccupants: PropTypes.number,
        listingCategory: PropTypes.string,
        pricingMode: PropTypes.string,
        stayType: PropTypes.string,
        pricePerNight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        maxGuests: PropTypes.number,
        bedrooms: PropTypes.number,
        instantBook: PropTypes.bool,
        availableFrom: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        furnishingStatus: PropTypes.string,
        securityDeposit: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        electricityBilling: PropTypes.string,
        paymentPreference: PropTypes.string,
        washroomType: PropTypes.string,
        attachedWashroom: PropTypes.bool,
        roomType: PropTypes.string,
        facilities: PropTypes.objectOf(PropTypes.bool),
        landlordName: PropTypes.string,
        landlord: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({
                name: PropTypes.string,
                avatarUrl: PropTypes.string,
                profilePicture: PropTypes.string,
                isVerified: PropTypes.bool,
                kyc_status: PropTypes.string,
                verificationLevel: PropTypes.string,
                roleProfiles: PropTypes.shape({
                    landlord: PropTypes.shape({
                        name: PropTypes.string,
                        avatarUrl: PropTypes.string,
                        profilePicture: PropTypes.string,
                    }),
                }),
                verifications: PropTypes.shape({
                    identity: PropTypes.bool,
                    property: PropTypes.bool,
                }),
            }),
        ]),
        verifications: PropTypes.shape({
            property: PropTypes.bool,
        }),
        tenantPreferences: PropTypes.shape({
            familyStatus: PropTypes.string,
            allowedGender: PropTypes.string,
        }),
        _match: PropTypes.shape({
            distanceKm: PropTypes.number,
        }),
        _recommendation: PropTypes.shape({
            distanceKm: PropTypes.number,
        }),
    }).isRequired,
};

export default React.memo(RoomCard);
