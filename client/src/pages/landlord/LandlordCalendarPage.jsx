// client/src/pages/LandlordCalendarPage.jsx (PROFESSIONAL REDESIGN)

import React, { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import Spinner from '../../components/common/Spinner';
import api from '../../api';
import toast from 'react-hot-toast';
import RoomFilterDropdown from '../../components/features/search/RoomFilterDropdown'; // <<< Import the new dropdown

const LandlordCalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoomId, setSelectedRoomId] = useState('all');
    
    useEffect(() => {
        const fetchCalendarData = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/landlords/calendar-data');
                // The backend now sends a 'color' property with each booking
                setEvents(data.bookings); 
                setRooms(data.rooms);
            } catch (error) {
                toast.error("Could not load calendar data.");
            } finally {
                setLoading(false);
            }
        };
        fetchCalendarData();
    }, []);

    const filteredEvents = useMemo(() => {
        if (selectedRoomId === 'all') return events;
        return events.filter(event => event.roomId === selectedRoomId);
    }, [events, selectedRoomId]);

    const handleEventClick = (clickInfo) => {
        alert(`Event: ${clickInfo.event.title}`);
    };

    // <<< NEW: Custom function to render cleaner events >>>
    const renderEventContent = (eventInfo) => {
        return (
            <div className="p-1 text-xs font-semibold overflow-hidden truncate">
                <i>{eventInfo.event.title}</i>
            </div>
        );
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;

    return (
        <div className="bg-slate-50 min-h-full p-4 sm:p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* NEW: Professional Header / Control Bar  */}
                <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Booking Calendar</h1>
                        <p className="text-sm text-slate-500">View and manage your bookings.</p>
                    </div>
                    <RoomFilterDropdown 
                        rooms={rooms}
                        selectedRoomId={selectedRoomId}
                        onSelectRoom={setSelectedRoomId}
                    />
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        events={filteredEvents}
                        eventClick={handleEventClick}
                        // Cleaner event rendering and clutter prevention 
                        eventContent={renderEventContent} // Use our custom render function
                        dayMaxEvents={true} 
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,dayGridWeek'
                        }}
                        height="auto"
                    />
                </div>
            </div>
        </div>
    );
};

export default LandlordCalendarPage;