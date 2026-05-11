import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownUp, Check, ChevronDown, Heart, Search } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';
import RoomCard from '../../components/features/rooms/RoomCard';

const SORT_OPTIONS = [
    { value: 'date_desc', label: 'Recently listed', hint: 'Newest saved rooms first' },
    { value: 'price_asc', label: 'Price low to high', hint: 'Best budget matches' },
    { value: 'price_desc', label: 'Price high to low', hint: 'Premium rooms first' },
    { value: 'city_asc', label: 'City A-Z', hint: 'Group by location' },
];

const SortDropdown = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const activeOption = SORT_OPTIONS.find((option) => option.value === value) || SORT_OPTIONS[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex items-center gap-2 rounded-2xl border border-light-border bg-light-card px-3 py-2.5 text-sm font-black text-light-text shadow-sm transition hover:border-cyan-400 hover:shadow-md dark:border-dark-border dark:bg-dark-card dark:text-dark-text"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <ArrowDownUp className="h-4 w-4 text-cyan-500" />
                <span className="max-w-[150px] truncate">{activeOption.label}</span>
                <ChevronDown className={`h-4 w-4 text-light-muted transition dark:text-dark-muted ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-light-border bg-white p-1.5 shadow-2xl shadow-slate-950/15 dark:border-dark-border dark:bg-dark-sidebar dark:shadow-black/35"
                >
                    {SORT_OPTIONS.map((option) => {
                        const active = option.value === value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                    active
                                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                        : 'text-light-text hover:bg-light-bg dark:text-dark-text dark:hover:bg-dark-card'
                                }`}
                            >
                                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                                    active ? 'bg-white/20 text-white' : 'bg-cyan-500/10 text-cyan-500 dark:bg-cyan-400/10 dark:text-cyan-300'
                                }`}>
                                    {active ? <Check className="h-4 w-4" /> : <ArrowDownUp className="h-3.5 w-3.5" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-black">{option.label}</span>
                                    <span className={`block truncate text-[11px] font-semibold ${active ? 'text-white/75' : 'text-light-muted dark:text-dark-muted'}`}>
                                        {option.hint}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

function WishlistPage() {
    const [wishlistedRooms, setWishlistedRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');
    const { removeFromWishlist } = useAuth();

    useEffect(() => {
        let active = true;

        const fetchWishlist = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/users/wishlist');
                if (active) {
                    setWishlistedRooms(data.wishlist || []);
                    setError('');
                }
            } catch (err) {
                if (active) setError(err.response?.data?.message || 'Could not load your wishlist.');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchWishlist();
        return () => {
            active = false;
        };
    }, []);

    const sortedRooms = useMemo(() => {
        const rooms = [...wishlistedRooms];
        rooms.sort((a, b) => {
            if (sortBy === 'price_asc') return Number(a.rent || 0) - Number(b.rent || 0);
            if (sortBy === 'price_desc') return Number(b.rent || 0) - Number(a.rent || 0);
            if (sortBy === 'city_asc') {
                return (a.location?.city || a.city || '').localeCompare(b.location?.city || b.city || '');
            }
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        return rooms;
    }, [wishlistedRooms, sortBy]);

    const handleRemoveFromWishlist = async (roomId) => {
        await removeFromWishlist(roomId);
        setWishlistedRooms((prev) => prev.filter((room) => room._id !== roomId));
    };

    if (loading) {
        return (
            <div className="flex h-80 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-3xl p-4 md:p-8">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-light-bg px-4 pb-24 pt-6 text-light-text dark:bg-dark-bg dark:text-dark-text md:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Saved rooms</p>
                        <h1 className="mt-1.5 text-2xl font-black tracking-tight md:text-[28px]">Wishlist</h1>
                        <p className="mt-1.5 text-xs text-light-muted dark:text-dark-muted md:text-sm">Compare rooms you saved from live listings.</p>
                    </div>
                    <SortDropdown value={sortBy} onChange={setSortBy} />
                </div>

                {sortedRooms.length === 0 ? (
                    <div className="mt-10 rounded-3xl border border-dashed border-light-border bg-light-card p-10 text-center dark:border-dark-border dark:bg-dark-card">
                        <Heart className="mx-auto h-12 w-12 text-brand" />
                        <h2 className="mt-4 text-2xl font-semibold">Your wishlist is empty</h2>
                        <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">Tap the heart on a room to save it here.</p>
                        <Link to="/rooms" className="btn-primary mt-6 inline-flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Browse rooms
                        </Link>
                    </div>
                ) : (
                    <div className="mobile-room-grid mt-6 grid gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                        {sortedRooms.map((room) => (
                            <RoomCard key={room._id} room={room} context="saved" onRemove={handleRemoveFromWishlist} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default WishlistPage;
