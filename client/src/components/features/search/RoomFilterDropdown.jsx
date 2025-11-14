// client/src/components/RoomFilterDropdown.jsx

import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

const RoomFilterDropdown = ({ rooms, selectedRoomId, onSelectRoom }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedRoom = rooms.find(r => r._id === selectedRoomId) || { title: 'Show All Rooms' };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (roomId) => {
        onSelectRoom(roomId);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative w-full sm:w-64">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg flex items-center justify-between"
            >
                <span className="truncate">{selectedRoom.title}</span>
                <FaChevronDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                    <ul className="max-h-60 overflow-y-auto">
                        <li
                            onClick={() => handleSelect('all')}
                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer"
                        >
                            Show All Rooms
                        </li>
                        {rooms.map(room => (
                            <li
                                key={room._id}
                                onClick={() => handleSelect(room._id)}
                                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer truncate"
                            >
                                {room.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default RoomFilterDropdown;