import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Award,
    Bath,
    BedDouble,
    ChevronLeft,
    ChevronRight,
    Heart,
    Home,
    MapPin,
    ShieldCheck,
    Star,
    Trash2,
    User,
    Users,
    Users2,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useAuth } from '../../../context/AuthContext';
import { formatRoomFieldValue, getVisibleCardFields } from '../../../utils/roomFieldUtils';
import fallbackRoomImage from '../../../assets/background_img.jpg';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

function RoomCard({ room, context = 'default', onRemove, imagePriority = false }) {
    const { user, addToWishlist, removeFromWishlist } = useAuth();
    const imageUrls = (Array.isArray(room.images) && room.images.length > 0
        ? room.images
        : Array.isArray(room.imageUrls) && room.imageUrls.length > 0
            ? room.imageUrls
            : [room.imageUrl || fallbackRoomImage])
        .map((image) => image?.url || image)
        .filter(Boolean);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const isSavedContext = context === 'saved';
    const isWishlisted = Boolean(user?.wishlist?.some((item) => String(item?._id || item) === String(room._id)));
    const rating = room.averageRating || room.rating;
    const isGuestFavourite = Number(rating || 0) >= 4.8;
    const configCardFields = getVisibleCardFields(room)
        .filter(({ field }) => !['title', 'rent', 'beds', 'roomType', 'familyStatus', 'fullAddress', 'city', 'washroomType', 'attachedWashroom'].includes(field.key))
        .slice(0, 3);

    const handleWishlistClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isSavedContext && onRemove) {
            onRemove(room._id);
            return;
        }
        if (!user) return;
        if (isWishlisted) removeFromWishlist(room._id);
        else addToWishlist(room._id);
    };

    const handleNextImage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imageUrls.length);
    };

    const handlePrevImage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCurrentImageIndex((prevIndex) => (prevIndex - 1 + imageUrls.length) % imageUrls.length);
    };

    useEffect(() => {
        if (!isHovered || imageUrls.length <= 1) return undefined;

        const previewTimer = window.setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imageUrls.length);
        }, 3200);

        return () => window.clearInterval(previewTimer);
    }, [imageUrls.length, isHovered]);

    const getRoomTypeTag = () => {
        const type = room.roomType || '';
        let Icon = User;
        let text = 'Private room';

        if (type.includes('Single')) {
            Icon = User;
            text = 'Single';
        } else if (type.includes('2 beds')) {
            Icon = Users;
            text = '2-bed';
        } else if (type.includes('3+ beds')) {
            Icon = Users;
            text = '3+ share';
        } else if (type.includes('BHK')) {
            Icon = Home;
            text = type;
        }

        return { Icon, text };
    };

    const getTenantTag = () => {
        const prefs = room.tenantPreferences || {};
        const familyStatus = prefs.familyStatus || 'Any';
        const allowedGender = prefs.allowedGender || 'Any';

        if (familyStatus === 'Family') return { Icon: Users2, text: 'Family' };
        if (familyStatus === 'Bachelors' && allowedGender === 'Male') return { Icon: User, text: 'Men' };
        if (familyStatus === 'Bachelors' && allowedGender === 'Female') return { Icon: User, text: 'Women' };
        if (familyStatus === 'Bachelors') return { Icon: Users, text: 'Bachelor' };
        return { Icon: Users2, text: 'Any' };
    };

    if (!room || !room._id) return null;

    const roomTag = getRoomTypeTag();
    const tenantTag = getTenantTag();
    const city = room.location?.city || room.city || 'India';
    const state = room.location?.state || '';
    const locationLabel = [city, state].filter(Boolean).join(', ');
    const landlord = room.landlord || {};
    const landlordProfile = landlord.roleProfiles?.landlord || {};
    const hostName = landlordProfile.name || landlord.name || room.landlordName || 'RoomRadar host';
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
    const imageLoading = imagePriority ? 'eager' : 'lazy';
    const imageFetchPriority = imagePriority ? 'high' : 'auto';
    const washroomText = room.washroomType || (room.attachedWashroom ? 'Attached' : '');
    const detailTags = [
        roomTag,
        tenantTag,
        {
            Icon: BedDouble,
            text: `${room.beds || 1} bed${Number(room.beds || 1) > 1 ? 's' : ''}`,
            tone: 'accent',
        },
        washroomText && {
            Icon: Bath,
            text: washroomText,
            tone: 'accent',
        },
        ...configCardFields.slice(0, 2).map(({ field, value }) => ({
            Icon: Bath,
            text: formatRoomFieldValue(field, value),
            tone: 'accent',
        })),
    ].filter(Boolean);

    return (
        <article
            className="room-card-pro rr-room-card group h-full cursor-pointer"
        >
            <Link to={`/room/${room._id}`} className="flex h-full flex-col">
                <div
                    className="rr-room-card-media relative overflow-hidden bg-light-border dark:bg-dark-input"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <img
                        key={imageUrls[currentImageIndex]}
                        src={imageUrls[currentImageIndex]}
                        alt={room.title || 'Room'}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                        loading={imageLoading}
                        decoding="async"
                        fetchPriority={imageFetchPriority}
                        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 280px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/52 via-transparent to-black/10 opacity-80" />

                    {(isGuestFavourite || isVerifiedHost || room.verifications?.property) && (
                        <span className={`rr-card-badge rr-verify-badge ${isGuestFavourite ? 'is-guest-fav' : ''} absolute left-2.5 top-2.5 sm:left-4 sm:top-4`}>
                            <span className="rr-card-badge-icon">
                                {isGuestFavourite ? <Award /> : <ShieldCheck />}
                            </span>
                            <span className="rr-overlay-label">{isGuestFavourite ? 'Guest fav' : 'Verified'}</span>
                        </span>
                    )}

                    <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
                        {!rating && (
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
                        <span className="rr-location-badge">
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
                        <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 gap-1 sm:flex">
                            {imageUrls.slice(0, 5).map((_, slideIndex) => (
                                <span
                                    key={slideIndex}
                                    className={`h-1.5 rounded-full transition-all ${currentImageIndex === slideIndex ? 'w-5 bg-cyan-500' : 'w-1.5 bg-white/60'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="rr-room-card-body flex flex-1 flex-col px-2.5 pb-2.5 pt-2.5 sm:p-5">
                    <div className="min-w-0 flex-1">
                        <div className="rr-card-title-row mb-1.5 min-w-0">
                            <h3 className="rr-room-card-title rr-line-clamp-2 min-w-0 text-[12.5px] font-black leading-[1.18] text-light-text dark:text-dark-text min-[390px]:text-[13.25px] sm:text-[17px] sm:leading-[1.3]">
                                {room.title || `${city} room`}
                            </h3>
                        </div>
                        <div className="rr-card-price-row mb-1.5 flex min-w-0 items-center justify-between gap-1.5 sm:hidden">
                            <p className="rr-card-price-compact min-w-0">
                                <span className="text-[13.5px] font-black leading-none text-light-text dark:text-dark-text">{money(room.rent)}</span>
                                <span className="ml-0.5 text-[8.5px] font-bold leading-none text-light-muted dark:text-dark-muted">/mo</span>
                            </p>
                            <span className="rr-card-mini-status">Live</span>
                        </div>
                        <p className="rr-room-card-location mb-2 flex min-w-0 items-start gap-1 text-[9.5px] font-semibold leading-[1.16] text-light-muted dark:text-dark-muted sm:text-[12px]">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
                            <span className="rr-line-clamp-2 min-w-0">{locationLabel}</span>
                        </p>
                    </div>

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

                    <div className="rr-room-card-tags mb-1.5 grid min-w-0 grid-cols-2 gap-1.5 sm:mb-4 sm:flex sm:flex-wrap sm:gap-2.5">
                        {detailTags.slice(0, 4).map(({ Icon, text, tone }, tagIndex) => (
                            <span
                                key={`${text}-${tagIndex}`}
                                className={`rr-feature-pill inline-flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1.5 text-[9.5px] font-bold leading-none sm:px-3 sm:py-2 sm:text-[11px] ${
                                    tone === 'accent'
                                        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200'
                                        : 'bg-light-bg text-light-muted dark:bg-dark-input dark:text-dark-muted'
                                } ${tagIndex > 2 ? 'rr-wide-only' : ''}`}
                            >
                                <Icon className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                                <span className="rr-feature-label min-w-0 truncate">{text}</span>
                            </span>
                        ))}
                    </div>

                    <div className="rr-room-card-footer mt-auto hidden items-end justify-between gap-3 border-t border-black/[0.08] pt-3 dark:border-white/[0.08] sm:flex sm:gap-4 sm:pt-4">
                        <p className="min-w-0">
                            <span className="rr-room-card-price text-[15px] font-bold leading-none text-light-text dark:text-dark-text min-[390px]:text-base sm:text-lg">
                                {money(room.rent)}
                            </span>
                            <span className="rr-room-card-price-unit ml-1 text-[11px] font-normal text-light-muted dark:text-dark-muted sm:text-xs">/month</span>
                        </p>
                        <span className="rr-room-card-view-btn hidden rounded-full bg-brand px-3 py-2 text-xs font-bold text-white transition group-hover:bg-red-600 sm:inline-flex">
                            View
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
        city: PropTypes.string,
        location: PropTypes.shape({
            city: PropTypes.string,
            state: PropTypes.string,
        }),
        rent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        averageRating: PropTypes.number,
        beds: PropTypes.number,
        washroomType: PropTypes.string,
        attachedWashroom: PropTypes.bool,
        roomType: PropTypes.string,
        landlordName: PropTypes.string,
        landlord: PropTypes.shape({
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
        verifications: PropTypes.shape({
            property: PropTypes.bool,
        }),
        tenantPreferences: PropTypes.shape({
            familyStatus: PropTypes.string,
            allowedGender: PropTypes.string,
        }),
    }).isRequired,
};

export default React.memo(RoomCard);
