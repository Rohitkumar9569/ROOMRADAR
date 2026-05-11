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
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded-2xl border border-light-border bg-light-card px-4 py-3 text-sm font-bold text-light-text shadow-sm transition hover:border-brand/40 dark:border-dark-border dark:bg-dark-card dark:text-dark-text"
            >
                <span className="truncate">{selectedRoom.title}</span>
                <FaChevronDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-light-border bg-light-card shadow-2xl dark:border-dark-border dark:bg-dark-card">
                    <ul className="max-h-60 overflow-y-auto">
                        <li
                            onClick={() => handleSelect('all')}
                            className="cursor-pointer px-4 py-3 text-sm font-bold text-light-text transition hover:bg-brand/10 hover:text-brand dark:text-dark-text dark:hover:bg-dark-input"
                        >
                            Show All Rooms
                        </li>
                        {rooms.map(room => (
                            <li
                                key={room._id}
                                onClick={() => handleSelect(room._id)}
                                className="cursor-pointer truncate px-4 py-3 text-sm font-bold text-light-muted transition hover:bg-brand/10 hover:text-brand dark:text-dark-muted dark:hover:bg-dark-input"
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
