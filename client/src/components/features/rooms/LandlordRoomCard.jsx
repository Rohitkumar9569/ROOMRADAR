import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaEye, FaEyeSlash, FaEllipsisV, FaBed, FaMapMarkerAlt, FaRupeeSign, FaInfoCircle } from 'react-icons/fa';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

const LandlordRoomCard = ({ room, onDelete, onStatusToggle }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const getStatusUI = (status) => {
        const styles = {
            Pending: 'bg-yellow-100 text-yellow-800',
            Published: 'bg-green-100 text-green-800',
            Unpublished: 'bg-gray-100 text-gray-800',
        };
        return <span className={`capitalize absolute top-3 left-3 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${styles[status] || styles.Unpublished}`}>{status}</span>;
    };

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col transition-shadow hover:shadow-lg">
            <div className="relative">
                <img src={room.images[0] || 'https://via.placeholder.com/400x300'} alt={room.title} className="w-full h-48 object-cover rounded-t-xl" />
                {getStatusUI(room.status)}
                
                <div ref={menuRef} className="absolute top-3 right-3">
                    <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white">
                        <FaEllipsisV />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 py-1 border">
                            <Link to={`/landlord/edit-room/${room._id}`} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <FaEdit className="mr-3" /> Edit Listing
                            </Link>

                            {room.status !== 'Pending' && (
                                <button
                                    onClick={() => {
                                        onStatusToggle(room._id, room.status);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {room.status === 'Published' ? <FaEyeSlash className="mr-3" /> : <FaEye className="mr-3" />}
                                    {room.status === 'Published' ? 'Unpublish' : 'Publish'}
                                </button>
                            )}

                            <div className="border-t my-1"></div>
                            <button
                                onClick={() => {
                                    onDelete(room._id);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <FaTrash className="mr-3" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start gap-2">
                    <h2 className="text-lg font-bold text-gray-800 truncate">{room.title}</h2>
                    {room.status === 'Unpublished' && room.rejectionReason && (
                        <Tippy content={`Admin's Reason: ${room.rejectionReason}`} placement="top">
                            <span className="text-red-500 cursor-pointer flex-shrink-0">
                                <FaInfoCircle size={18} />
                            </span>
                        </Tippy>
                    )}
                </div>
                <p className="flex items-center text-sm text-gray-500 mt-1 truncate">
                    <FaMapMarkerAlt className="mr-2 flex-shrink-0" /> {room.location.fullAddress}
                </p>
                <div className="mt-4 flex justify-between items-center text-sm">
                    <span className="flex items-center font-semibold"><FaRupeeSign className="mr-1" />{room.rent.toLocaleString()}/month</span>
                    <span className="flex items-center text-gray-600"><FaBed className="mr-2" />{room.beds} Bed(s)</span>
                </div>
            </div>
        </div>
    );
};

export default LandlordRoomCard;