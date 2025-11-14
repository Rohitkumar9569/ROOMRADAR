// client/src/pages/WishlistPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
//  All icons replaced with lucide-react
import { 
    Heart, 
    MapPin, 
    Pencil, 
    Save, 
    ArrowDownUp,
} from 'lucide-react';

// WishlistItemCard Component
const WishlistItemCard = ({ room, onRemove, note, onSaveNote }) => {
    const [noteText, setNoteText] = useState(note || '');
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);

    const handleSaveClick = () => {
        onSaveNote(room._id, noteText);
        setIsEditingNote(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden flex flex-col">
            <div className="relative">
                <Link to={`/room/${room._id}`}>
                    <img className="w-full h-48 object-cover" src={room.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'} alt={room.title} />
                </Link>
                <div className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full text-white shadow-md ${room.status === 'Published' ? 'bg-green-500' : 'bg-gray-500'}`}>{room.status}</div>
                <button onClick={() => onRemove(room._id)} className="absolute top-3 right-3 p-2 bg-white/70 backdrop-blur-sm rounded-full cursor-pointer transition-transform duration-200 ease-in-out hover:scale-110" aria-label="Remove from wishlist">
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                </button>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-gray-800 break-words truncate">{room.title}</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center truncate"><MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-gray-400" />{room.fullAddress}</p>
                <div className="flex-grow"></div>
                <div className="mt-4 flex justify-between items-center">
                    <p className="text-xl font-bold text-indigo-600">
                        ₹{new Intl.NumberFormat('en-IN').format(room.price || 0)}
                        <span className="text-sm font-medium text-gray-500"> /mo</span>
                    </p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                    {isEditingNote ? (
                        <div className="flex flex-col gap-2">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Add your personal note..."
                                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                rows="2"
                            ></textarea>
                            <button onClick={handleSaveClick} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                                <Save className="h-4 w-4" /> Save Note
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {note ? (
                                <>
                                    <p className={`text-sm text-gray-600 italic ${isNoteExpanded ? '' : 'truncate'}`}>{note}</p>
                                    {note.length > 50 && (
                                        <button onClick={() => setIsNoteExpanded(!isNoteExpanded)} className="text-xs font-semibold text-indigo-600 hover:underline text-left mt-1">
                                            {isNoteExpanded ? 'Show less' : 'Show more'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No notes added.</p>
                            )}
                            <button onClick={() => setIsEditingNote(true)} className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1.5 mt-2">
                                <Pencil className="h-3 w-3"/> {note ? 'Edit Note' : 'Add Note'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


function WishlistPage() {
    // State hooks 
    const [wishlistedRooms, setWishlistedRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, removeFromWishlist } = useAuth();
    const [sortBy, setSortBy] = useState('date_desc');
    const [notes, setNotes] = useState({});

    // useEffect and handler functions 
    useEffect(() => {
        const savedNotes = JSON.parse(localStorage.getItem('wishlistNotes')) || {};
        setNotes(savedNotes);
    }, []);

    useEffect(() => {
        const fetchWishlist = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/users/wishlist');
                setWishlistedRooms(data.wishlist || []);
            } catch (err) {
                setError("Could not load your wishlist.");
            } finally {
                setLoading(false);
            }
        };
        fetchWishlist();
    }, [user]);

    const sortedAndFilteredRooms = useMemo(() => {
        const sortableRooms = [...wishlistedRooms];
        sortableRooms.sort((a, b) => {
            switch (sortBy) {
                case 'price_asc': return a.price - b.price;
                case 'price_desc': return b.price - a.price;
                case 'date_desc': default: return 0;
            }
        });
        return sortableRooms;
    }, [wishlistedRooms, sortBy]);

    const handleRemoveFromWishlist = (roomId) => {
        removeFromWishlist(roomId);
        setWishlistedRooms(prev => prev.filter(room => room._id !== roomId));
    };

    const handleSaveNote = (roomId, noteText) => {
        const newNotes = { ...notes, [roomId]: noteText };
        setNotes(newNotes);
        localStorage.setItem('wishlistNotes', JSON.stringify(newNotes));
    };

    if (loading) return <div className="container mx-auto px-4 pt-6 pb-8">Loading...</div>;
    if (error) return <div className="container mx-auto px-4 pt-6 pb-8 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto px-4 pt-6 pb-8">
            <div className="flex justify-end items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <ArrowDownUp className="h-4 w-4 text-gray-500" />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs font-semibold py-1 px-2 border-gray-300 rounded-md focus:ring-indigo-500">
                            <option value="date_desc">Sort by Date Added</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedAndFilteredRooms.length > 0 ? (
                    sortedAndFilteredRooms.map(room => (
                        <WishlistItemCard
                            key={room._id}
                            room={room}
                            onRemove={handleRemoveFromWishlist}
                            note={notes[room._id]}
                            onSaveNote={handleSaveNote}
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg">
                        <Heart className="mx-auto h-10 w-10 text-gray-300 mb-4" />
                        <h2 className="text-xl font-semibold">Your Wishlist is Empty</h2>
                        <p className="text-gray-500 mt-2">You haven't added any rooms yet.</p>
                        <Link to="/" className="mt-4 inline-block px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                            Browse Rooms
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default WishlistPage;