import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertCircle, BedDouble, Eye, EyeOff, MoreVertical, Pencil, Trash2, MapPin, IndianRupee, MessageSquare, MousePointerClick, ShieldCheck } from 'lucide-react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { useAuth } from '../../../context/AuthContext';
import fallbackRoomImage from '../../../assets/background_img.jpg';

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

const LandlordRoomCard = ({ room, onDelete, onStatusToggle }) => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const image = room.images?.[0]?.url || room.images?.[0] || room.imageUrl || fallbackRoomImage;
    const isLocked = ['Pending', 'Pending_Review', 'Booked', 'Confirmed', 'Suspended'].includes(room.status);
    const host = room.landlord || user || {};
    const landlordProfile = host.roleProfiles?.landlord || {};
    const hostName = landlordProfile.name || host.name || 'Your host profile';
    const city = room.location?.city || 'Location';
    const address = room.location?.fullAddress || room.location?.city || 'Address not set';
    const beds = Number(room.beds || 1);
    const views = room.stats?.views || room.views || 0;
    const requests = room.stats?.applications || room.activeApplicationsCount || 0;
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
                <img src={image} alt={room.title} className="h-full w-full object-cover" />
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
                    <span className="rr-location-badge rr-listing-city-badge">
                        <MapPin />
                        <span>{city}</span>
                    </span>
                    <span className="rr-rating-badge rr-listing-beds-badge">
                        <BedDouble />
                        {beds}
                    </span>
                </div>
            </div>

            <div className="rr-listing-card-body">
                <div className="rr-listing-info-stack">
                    <h2 className="rr-listing-card-title">{room.title}</h2>
                    <div className="rr-listing-card-price-row">
                        <div className="rr-listing-card-price">
                            <IndianRupee />
                            <span>{money(room.rent)}</span>
                            <span className="rr-listing-card-price-unit">/mo</span>
                        </div>
                        <span className="rr-listing-live-pill">{room.status === 'Published' ? 'Live' : room.status || 'Draft'}</span>
                    </div>
                    <p className="rr-listing-card-location">
                        <MapPin />
                        <span>{address}</span>
                    </p>
                </div>

                <div className="rr-listing-metrics">
                    <Metric label="Views" value={views} Icon={MousePointerClick} />
                    <Metric label="Requests" value={requests} Icon={MessageSquare} />
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
