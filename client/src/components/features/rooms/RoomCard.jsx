import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Award,
    Bath,
    BedDouble,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Heart,
    ShieldCheck,
    Star,
    Trash2,
    ImageOff,
    MapPin,
    Users,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useAuth } from '../../../context/AuthContext';
import { formatListingTitle } from '../../../utils/listingDisplay';
import { trackUsageEvent } from '../../../utils/usageAnalytics';
import { triggerHaptic } from '../../../utils/haptics';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;
const DAY_MS = 24 * 60 * 60 * 1000;

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

const getImageUrl = (image) => {
    if (!image) return '';
    if (typeof image === 'string') return image.trim();
    return String(image.url || image.secure_url || image.imageUrl || '').trim();
};

const getRealLocationLabel = (room = {}) => {
    const location = room.location || {};
    const parts = [
        location.locality,
        location.landmark,
        location.city || room.city,
        location.state,
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

function RoomCard({ room, context = 'default', trackingContext, onRemove, imagePriority = false, position, compact = false }) {
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
    const [photoDirection, setPhotoDirection] = useState('next');
    const [failedImageUrls, setFailedImageUrls] = useState([]);
    const [isHovered, setIsHovered] = useState(false);
    const [isMediaVisible, setIsMediaVisible] = useState(false);
    const [isActiveMobilePreview, setIsActiveMobilePreview] = useState(false);
    const cardRef = useRef(null);
    const mediaRef = useRef(null);
    const touchStartRef = useRef(null);
    const suppressNextClickRef = useRef(false);
    const previewIdRef = useRef(null);
    if (!previewIdRef.current) {
        previewIdRef.current = `${roomId || 'room'}-${Math.random().toString(36).slice(2)}`;
    }
    const canPreviewOnHover = useMemo(supportsFineHover, []);
    const isSavedContext = context === 'saved';
    const analyticsContext = trackingContext || context;
    const isWishlisted = Boolean(user?.wishlist?.some((item) => String(item?._id || item) === String(roomId)));
    const rating = cardRoom.averageRating || cardRoom.rating;
    const isGuestFavourite = Number(rating || 0) >= 4.8;
    const availableImageUrls = useMemo(
        () => imageUrls.filter((url) => !failedImageUrls.includes(url)),
        [failedImageUrls, imageUrls]
    );

    const handleWishlistClick = useCallback(async (event) => {
        event.preventDefault();
        event.stopPropagation();
        triggerHaptic('tap');
        if (isSavedContext && onRemove) {
            onRemove(roomId);
            trackUsageEvent('wishlist_remove', {
                metadata: {
                    roomId,
                    context: analyticsContext,
                    city: cardRoom.location?.city || cardRoom.city,
                },
            });
            return;
        }
        if (!user) {
            toast.error('Please log in to save rooms.');
            return;
        }
        if (isWishlisted) {
            const removed = await removeFromWishlist(roomId);
            if (!removed) {
                toast.error('Could not update wishlist.');
                return;
            }
            trackUsageEvent('wishlist_remove', {
                metadata: {
                    roomId,
                    context: analyticsContext,
                    city: cardRoom.location?.city || cardRoom.city,
                },
            });
        } else {
            const added = await addToWishlist(roomId);
            if (!added) {
                toast.error('Could not update wishlist.');
                return;
            }
            trackUsageEvent('wishlist_add', {
                metadata: {
                    roomId,
                    context: analyticsContext,
                    city: cardRoom.location?.city || cardRoom.city,
                },
            });
        }
    }, [addToWishlist, analyticsContext, cardRoom.city, cardRoom.location?.city, isSavedContext, isWishlisted, onRemove, removeFromWishlist, roomId, user]);

    const showImageByOffset = useCallback((offset) => {
        if (availableImageUrls.length <= 1) return;
        setPhotoDirection(offset >= 0 ? 'next' : 'prev');
        setCurrentImageIndex((prevIndex) => (prevIndex + offset + availableImageUrls.length) % availableImageUrls.length);
    }, [availableImageUrls.length]);

    const handleNextImage = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        showImageByOffset(1);
    }, [showImageByOffset]);

    const handlePrevImage = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        showImageByOffset(-1);
    }, [showImageByOffset]);

    const handlePhotoError = useCallback(() => {
        const failedUrl = availableImageUrls[currentImageIndex];
        if (!failedUrl) return;
        setFailedImageUrls((previousUrls) => (
            previousUrls.includes(failedUrl) ? previousUrls : [...previousUrls, failedUrl]
        ));
        setCurrentImageIndex(0);
    }, [availableImageUrls, currentImageIndex]);

    const handleCardClickCapture = useCallback((event) => {
        if (suppressNextClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressNextClickRef.current = false;
            return;
        }

        trackUsageEvent('room_click', {
            metadata: {
                roomId,
                context: analyticsContext,
                position,
                city: cardRoom.location?.city || cardRoom.city,
                rent: cardRoom.rent,
                status: cardRoom.status,
                listingCategory: cardRoom.listingCategory,
                recommendationSource: cardRoom._recommendation?.group || cardRoom._match?.matchedLabels?.join(', '),
            },
        });
    }, [analyticsContext, cardRoom._match?.matchedLabels, cardRoom._recommendation?.group, cardRoom.city, cardRoom.listingCategory, cardRoom.location?.city, cardRoom.rent, cardRoom.status, position, roomId]);

    const handleMediaTouchStart = useCallback((event) => {
        if (availableImageUrls.length <= 1) return;
        const touch = event.touches?.[0];
        if (!touch) return;
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        };
    }, [availableImageUrls.length]);

    const handleMediaTouchEnd = useCallback((event) => {
        if (availableImageUrls.length <= 1 || !touchStartRef.current) return;
        const touch = event.changedTouches?.[0];
        if (!touch) {
            touchStartRef.current = null;
            return;
        }

        const start = touchStartRef.current;
        touchStartRef.current = null;
        const deltaX = start.x - touch.clientX;
        const deltaY = start.y - touch.clientY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX < 34 || absX < absY * 1.18) return;

        event.preventDefault();
        event.stopPropagation();
        suppressNextClickRef.current = true;
        showImageByOffset(deltaX > 0 ? 1 : -1);

        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                suppressNextClickRef.current = false;
            }, 520);
        }
    }, [availableImageUrls.length, showImageByOffset]);

    const handleMediaTouchCancel = useCallback(() => {
        touchStartRef.current = null;
    }, []);

    const handleMouseEnter = useCallback(() => {
        if (canPreviewOnHover) setIsHovered(true);
    }, [canPreviewOnHover]);

    const handleMouseLeave = useCallback(() => {
        if (canPreviewOnHover) setIsHovered(false);
    }, [canPreviewOnHover]);

    useEffect(() => {
        setCurrentImageIndex(0);
    }, [availableImageUrls.length]);

    useEffect(() => {
        setFailedImageUrls((previousUrls) => {
            const nextUrls = previousUrls.filter((url) => imageUrls.includes(url));
            return nextUrls.length === previousUrls.length ? previousUrls : nextUrls;
        });
    }, [imageUrls]);

    useEffect(() => {
        const mediaNode = mediaRef.current;
        if (!mediaNode || availableImageUrls.length <= 1 || typeof IntersectionObserver === 'undefined') {
            setIsMediaVisible(true);
            return undefined;
        }

        const observer = new IntersectionObserver(
            ([entry]) => setIsMediaVisible(entry.isIntersecting && entry.intersectionRatio > 0.35),
            { threshold: [0, 0.35, 0.7] }
        );

        observer.observe(mediaNode);
        return () => observer.disconnect();
    }, [availableImageUrls.length]);

    useEffect(() => {
        if (canPreviewOnHover || availableImageUrls.length <= 1 || typeof window === 'undefined') {
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
    }, [availableImageUrls.length, canPreviewOnHover]);

    const shouldAutoAdvanceImages = availableImageUrls.length > 1
        && isMediaVisible
        && (canPreviewOnHover ? isHovered : isActiveMobilePreview);
    const activeSlideDuration = canPreviewOnHover ? IMAGE_AUTO_ADVANCE_MS : MOBILE_IMAGE_AUTO_ADVANCE_MS;

    useEffect(() => {
        if (!shouldAutoAdvanceImages) return undefined;
        if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

        const previewTimer = window.setInterval(() => {
            setPhotoDirection('next');
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % availableImageUrls.length);
        }, activeSlideDuration);

        return () => window.clearInterval(previewTimer);
    }, [activeSlideDuration, availableImageUrls.length, shouldAutoAdvanceImages]);

    useEffect(() => {
        if (availableImageUrls.length <= 1 || typeof window === 'undefined') return undefined;
        const preloadIndexes = [
            (currentImageIndex + 1) % availableImageUrls.length,
            (currentImageIndex - 1 + availableImageUrls.length) % availableImageUrls.length,
        ];
        const preloaders = preloadIndexes
            .map((index) => availableImageUrls[index])
            .filter(Boolean)
            .map((url) => {
                const image = new window.Image();
                image.decoding = 'async';
                image.src = url;
                return image;
            });
        return () => {
            preloaders.forEach((image) => { image.onload = null; image.onerror = null; });
        };
    }, [availableImageUrls, currentImageIndex]);

    const imageLoading = imagePriority ? 'eager' : 'lazy';
    const imageFetchPriority = imagePriority ? 'high' : 'auto';
    const indicatorCount = Math.min(availableImageUrls.length, 5);
    const activeIndicatorIndex = indicatorCount > 0 ? currentImageIndex % indicatorCount : 0;
    const displayTitle = formatListingTitle(cardRoom.title, '');
    const rentAmount = Number(cardRoom.rent);
    const pricePerNight = Number(cardRoom.pricePerNight || 0);
    const pricingMode = String(cardRoom.pricingMode || 'monthly').toLowerCase();
    const displayPriceAmount = pricingMode !== 'monthly' && pricePerNight > 0 ? pricePerNight : rentAmount;
    const priceUnitFull = pricingMode === 'nightly' ? '/night' : pricingMode === 'daily' ? '/day' : '/month';
    const city = String(cardRoom.location?.city || cardRoom.city || '').trim();
    const locationLabel = getRealLocationLabel(cardRoom);
    const isBookedStatus = ['booked', 'confirmed'].includes(String(cardRoom.status || '').toLowerCase());

    if (!roomId || !displayTitle || !Number.isFinite(rentAmount) || rentAmount <= 0 || !city) return null;

    const landlord = room.landlord && typeof room.landlord === 'object' ? room.landlord : {};
    const isVerifiedHost = Boolean(
        landlord.isVerified
        || landlord.kyc_status === 'Verified'
        || ['verified', 'premium'].includes(landlord.verificationLevel)
        || landlord.verifications?.identity
        || landlord.verifications?.property
    );
    const showNewBadge = isRecentListing(cardRoom.createdAt);
    const roomTypeSummary = cardRoom.roomType
        ? normalizeRoomTypeLabel(cardRoom.roomType)
        : String(cardRoom.listingCategory || 'Room').trim();
    const tenantSummary = getTenantLabel(cardRoom);
    const washroomSummary = getWashroomLabel(cardRoom);
    const bedSummary = Number(cardRoom.beds || 0) > 0
        ? `${cardRoom.beds} bed${Number(cardRoom.beds) > 1 ? 's' : ''}`
        : '';
    const detailHighlights = [
        { key: 'tenant', label: tenantSummary, Icon: Users },
        { key: 'bath', label: washroomSummary, Icon: Bath },
        { key: 'beds', label: bedSummary, Icon: BedDouble },
    ]
        .map((item) => ({ ...item, label: String(item.label || '').trim() }))
        .filter((item) => item.label)
        .slice(0, 3);
    const eyebrowLabel = `${roomTypeSummary || 'Room'} in ${city}`;
    const isVerifiedListing = Boolean(isGuestFavourite || isVerifiedHost || cardRoom.verifications?.property);
    const primaryBadge = isBookedStatus
        ? { label: 'Booked', Icon: CalendarDays, className: 'rr-booked-badge' }
        : isGuestFavourite
            ? { label: 'Guest fav', Icon: Award, className: 'rr-verify-badge is-guest-fav' }
            : isVerifiedListing
                ? { label: 'Verified', Icon: ShieldCheck, className: 'rr-verify-badge' }
                : showNewBadge
                    ? { label: 'New', Icon: Star, className: 'rr-new-badge' }
                    : null;
    const PrimaryBadgeIcon = primaryBadge?.Icon;

    return (
        <article
            ref={cardRef}
            className={`room-card-pro rr-room-card group h-full cursor-pointer ${compact ? 'rr-room-card--compact' : ''}`}
        >
            <Link to={`/room/${room._id}`} className="flex h-full min-w-0 flex-1 flex-col w-full" onClickCapture={handleCardClickCapture}>
                <div
                    ref={mediaRef}
                    className="rr-room-card-media relative overflow-hidden bg-light-border dark:bg-dark-input"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleMediaTouchStart}
                    onTouchEnd={handleMediaTouchEnd}
                    onTouchCancel={handleMediaTouchCancel}
                >
                    {availableImageUrls.length > 0 ? (
                        <>
                            <img
                                key={`${availableImageUrls[currentImageIndex]}-${currentImageIndex}`}
                                src={availableImageUrls[currentImageIndex]}
                                alt={displayTitle}
                                className={`rr-card-photo-img rr-photo-${photoDirection} h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.018]`}
                                loading={imageLoading}
                                decoding="async"
                                fetchpriority={imageFetchPriority}
                                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 280px"
                                draggable="false"
                                onError={handlePhotoError}
                            />
                            <div className="rr-card-photo-shade absolute inset-0" />
                        </>
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 text-center text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                            <ImageOff className="h-8 w-8" />
                            <span className="mt-2 px-3 text-[11px] font-black uppercase tracking-wide">Photo pending</span>
                        </div>
                    )}

                    {primaryBadge && (
                        <div className="rr-card-badge-stack absolute left-2.5 top-2.5 flex max-w-[70%] items-start sm:left-4 sm:top-4">
                            <span className={`rr-card-badge ${primaryBadge.className}`}>
                                <span className="rr-card-badge-icon">
                                    {PrimaryBadgeIcon && <PrimaryBadgeIcon />}
                                </span>
                                <span className="rr-overlay-label">{primaryBadge.label}</span>
                            </span>
                        </div>
                    )}

                    <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
                        {showNewBadge && primaryBadge?.label !== 'New' && (
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

                    {isHovered && availableImageUrls.length > 1 && (
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

                    {availableImageUrls.length > 1 && (
                        <div className="rr-image-progress-strip" style={{ '--rr-slide-duration': `${activeSlideDuration}ms` }}>
                            {availableImageUrls.slice(0, indicatorCount).map((_, slideIndex) => (
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

                <div className="rr-room-card-body flex flex-1 flex-col p-3 sm:p-4">
                    <p className="rr-card-eyebrow min-w-0 truncate text-[11px] font-bold leading-tight text-light-muted dark:text-dark-muted sm:text-[12px]">
                        {eyebrowLabel}
                    </p>

                    <h3 className="rr-room-card-title rr-line-clamp-2 min-w-0 text-[15px] font-black leading-tight text-light-text dark:text-dark-text sm:text-[17px]">
                        {displayTitle}
                    </h3>

                    <div className="rr-card-detail-chips">
                        {(detailHighlights.length ? detailHighlights : [{ key: 'type', label: roomTypeSummary, Icon: ShieldCheck }]).slice(0, 3).map(({ key, label, Icon }) => (
                            <span key={`${key}-${label}`} className="rr-card-detail-chip">
                                <Icon className="rr-card-detail-icon" />
                                <span>{label}</span>
                            </span>
                        ))}
                    </div>

                    {locationLabel && (
                        <p className="rr-room-card-location min-w-0 text-[11px] font-semibold leading-5 text-light-muted/90 dark:text-dark-muted sm:text-xs">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{locationLabel}</span>
                        </p>
                    )}

                    <div className="rr-room-card-footer mt-auto flex items-end justify-between gap-3 pt-3 sm:pt-4">
                        <p className="min-w-0">
                            <span className="rr-room-card-price text-[17px] font-black leading-none text-light-text dark:text-dark-text sm:text-xl">
                                {money(displayPriceAmount)}
                            </span>
                            <span className="rr-room-card-price-unit ml-1 text-xs font-semibold text-light-muted dark:text-dark-muted">{priceUnitFull}</span>
                        </p>
                        {rating && (
                            <span className="rr-card-body-rating inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-black text-light-text dark:text-dark-text sm:text-xs">
                                <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                                {Number(rating).toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        </article>
    );
}

RoomCard.propTypes = {
    compact: PropTypes.bool,
    context: PropTypes.oneOf(['default', 'saved']),
    imagePriority: PropTypes.bool,
    onRemove: PropTypes.func,
    position: PropTypes.number,
    trackingContext: PropTypes.string,
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
