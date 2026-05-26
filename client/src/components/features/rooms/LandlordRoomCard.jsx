import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertCircle, BedDouble, Eye, EyeOff, MoreVertical, Pencil, Trash2, MapPin, IndianRupee, MessageSquare, MousePointerClick, ShieldCheck, ImageOff } from 'lucide-react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { useAuth } from '../../../context/AuthContext';
import { formatListingTitle } from '../../../utils/listingDisplay';

const statusTone = {
    Pending: 'is-pending',
    Pending_Review: 'is-pending',
    Published: 'is-published',
    Unpublished: 'is-muted',
    Rejected: 'is-muted',
    Suspended: 'is-muted',
    Booked: 'is-booked',
    Confirmed: 'is-booked',
};

const money = (value) => Number(value || 0).toLocaleString('en-IN');

const getImageUrl = (image) => {
    if (!image) return '';
    return typeof image === 'string' ? image : image.url || '';
};

const countWords = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

const getListingQualityScore = (room) => {
    const imageCount = Math.max(
        Array.isArray(room.images) ? room.images.filter(Boolean).length : 0,
        room.imageUrl ? 1 : 0
    );
    const descriptionWords = countWords(room.description);
    const selectedAmenities = Object.values(room.facilities || {}).filter(Boolean).length;
    const hasPinnedLocation = Array.isArray(room.location?.coordinates)
        && room.location.coordinates.length === 2
        && room.location.coordinates.every((value) => Number.isFinite(Number(value)));

    const photoScore = Math.round((Math.min(imageCount, 5) / 5) * 40);
    const descriptionScore = Math.round((Math.min(descriptionWords, 150) / 150) * 20);
    const amenityScore = Math.round((Math.min(selectedAmenities, 8) / 8) * 20);
    const locationScore = (hasPinnedLocation ? 12 : 0) + (room.location?.fullAddress ? 4 : 0) + (room.location?.city ? 2 : 0) + (room.location?.pincode || room.location?.postalCode ? 2 : 0);

    return Math.min(100, photoScore + descriptionScore + amenityScore + locationScore);
};

const LandlordRoomCard = ({ room, onDelete, onStatusToggle }) => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const image = getImageUrl(room.images?.[0]) || getImageUrl(room.imageUrl);
    const isLocked = ['Pending', 'Pending_Review', 'Booked', 'Confirmed', 'Suspended'].includes(room.status);
    const host = room.landlord || user || {};
    const landlordProfile = host.roleProfiles?.landlord || {};
    const hostName = landlordProfile.name || host.name || 'Your host profile';
    const city = room.location?.city || '';
    const address = room.location?.fullAddress || room.location?.locality || room.location?.city || '';
    const beds = Number(room.beds || 0);
    const requests = Number(room.stats?.applications || room.activeApplicationsCount || 0);
    const trackedViews = Number(room.stats?.views || room.views || 0);
    const views = Math.max(trackedViews, requests);
    const displayTitle = formatListingTitle(room.title);
    const qualityScore = getListingQualityScore(room);
    const isVerifiedHost = Boolean(
        host.isVerified
        || host.kyc_status === 'Verified'
        || ['verified', 'premium'].includes(host.verificationLevel)
        || host.verifications?.identity
        || host.verifications?.property
    );

    const updateMenuPosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = Math.min(208, window.innerWidth - 16);
        const left = Math.min(
            Math.max(rect.right - menuWidth, 8),
            window.innerWidth - menuWidth - 8
        );
        const top = Math.min(rect.bottom + 8, window.innerHeight - 168);
        setMenuPosition({ left, top, width: menuWidth });
    }, []);

    useEffect(() => {
        if (!isMenuOpen) return undefined;
        updateMenuPosition();
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);
        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [isMenuOpen, updateMenuPosition]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const clickedMenu = menuRef.current?.contains(event.target);
            const clickedButton = buttonRef.current?.contains(event.target);
            if (!clickedMenu && !clickedButton) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menu = isMenuOpen && menuPosition ? createPortal(
        <div
            ref={menuRef}
            className="rr-listing-menu rr-listing-menu-portal"
            style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px`, width: `${menuPosition.width}px` }}
        >
            <Link to={`/landlord/edit-room/${room._id}`} onClick={() => setIsMenuOpen(false)} className="rr-listing-menu-item">
                <Pencil className="h-4 w-4" />
                Edit listing
            </Link>

            {!isLocked && (
                <button
                    type="button"
                    onClick={() => {
                        onStatusToggle(room._id, room.status);
                        setIsMenuOpen(false);
                    }}
                    className="rr-listing-menu-item"
                >
                    {room.status === 'Published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {room.status === 'Published' ? 'Unpublish' : 'Request review'}
                </button>
            )}

            <div className="my-1 border-t border-slate-100 dark:border-secondary-700" />
            <button
                type="button"
                onClick={() => {
                    onDelete(room._id);
                    setIsMenuOpen(false);
                }}
                className="rr-listing-menu-item is-danger"
            >
                <Trash2 className="h-4 w-4" />
                Delete
            </button>
        </div>,
        document.body
    ) : null;

    return (
        <article className="rr-listing-card-pro group h-full">
            <div className="rr-listing-card-media">
                {image ? (
                    <img src={image} alt={displayTitle} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-500 dark:bg-secondary-900 dark:text-secondary-300">
                        <ImageOff className="h-7 w-7" />
                        <span className="mt-2 text-[11px] font-black uppercase tracking-wide">Photo pending</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/56 via-slate-950/5 to-transparent" />

                <span className={`rr-listing-status-badge ${statusTone[room.status] || statusTone.Unpublished}`}>
                    <span className="rr-listing-status-dot" />
                    <span>{room.status || 'Draft'}</span>
                </span>

                <div className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4">
                    <button
                        ref={buttonRef}
                        type="button"
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        className="rr-listing-menu-btn"
                        aria-label="Listing actions"
                    >
                        <MoreVertical />
                    </button>
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2 sm:bottom-4 sm:left-4 sm:right-4">
                    {city && (
                        <span className="rr-location-badge rr-listing-city-badge has-side-badge">
                            <MapPin />
                            <span>{city}</span>
                        </span>
                    )}
                    {beds > 0 && (
                        <span className="rr-rating-badge rr-listing-beds-badge">
                            <BedDouble />
                            {beds}
                        </span>
                    )}
                </div>
            </div>

            <div className="rr-listing-card-body">
                <div className="rr-listing-info-stack">
                    <h2 className="rr-listing-card-title">{displayTitle}</h2>
                    <div className="rr-listing-card-price-row">
                        <div className="rr-listing-card-price">
                            <IndianRupee />
                            <span>{money(room.rent)}</span>
                            <span className="rr-listing-card-price-unit">/mo</span>
                        </div>
                        <span className="rr-listing-live-pill">{room.status === 'Published' ? 'Live' : room.status || 'Draft'}</span>
                    </div>
                    {address && (
                        <p className="rr-listing-card-location">
                            <MapPin />
                            <span>{address}</span>
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-secondary-700/80 dark:bg-secondary-900/45">
                    <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-secondary-300">
                        <span>Listing quality</span>
                        <span className={qualityScore >= 80 ? 'text-emerald-600 dark:text-emerald-300' : qualityScore >= 60 ? 'text-cyan-600 dark:text-cyan-300' : 'text-amber-600 dark:text-amber-300'}>
                            {qualityScore}%
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-secondary-800">
                        <div
                            className={`h-full rounded-full ${qualityScore >= 80 ? 'bg-emerald-500' : qualityScore >= 60 ? 'bg-cyan-500' : 'bg-amber-500'}`}
                            style={{ width: `${qualityScore}%` }}
                        />
                    </div>
                </div>

                <div className="rr-listing-metrics">
                    <Metric label="Views" value={views} Icon={MousePointerClick} />
                    <Metric label="Reqs" value={requests} Icon={MessageSquare} />
                </div>

                <div className="rr-listing-trust-row">
                    <div className="min-w-0">
                        <p className="rr-listing-trust-label">Host trust</p>
                        <p className="rr-listing-trust-name">{hostName}</p>
                    </div>
                    <span className={`rr-listing-trust-badge ${isVerifiedHost ? 'is-verified' : 'is-pending'}`}>
                        <ShieldCheck />
                        {isVerifiedHost ? 'Verified' : 'Pending'}
                    </span>
                </div>

                {room.status === 'Unpublished' && room.rejectionReason && (
                    <Tippy content={`Admin reason: ${room.rejectionReason}`} placement="top">
                        <div className="rr-listing-attention">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            Listing needs attention
                        </div>
                    </Tippy>
                )}
            </div>
            {menu}
        </article>
    );
};

const Metric = ({ label, value, Icon }) => (
    <div className="rr-listing-metric">
        <Icon />
        <div className="min-w-0">
            <p className="rr-listing-metric-label">{label}</p>
            <p className="rr-listing-metric-value">{value}</p>
        </div>
    </div>
);

export default LandlordRoomCard;
