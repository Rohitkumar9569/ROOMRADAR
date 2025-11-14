const Room = require('../models/Room');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const Application = require('../models/Application');

// CREATE ROOM
exports.createRoom = asyncHandler(async (req, res) => {
    try {
        const {
            title, description, location, beds, imageUrl, images, roomType,
            tenantPreferences, kitchen, floor, videoUrl, securityDeposit,
            facilities, kitchenAmenities, rules, rent,
            distanceCollege, distanceHospital, distanceMetro, distanceBusStand,
            distanceRailway, distanceMarket, noticePeriod, minimumStay, gateClosingTime
        } = req.body;

        if (!location || !location.coordinates || !location.fullAddress || !location.city) {
            return res.status(400).json({ message: 'A complete location object is required.' });
        }

        const room = new Room({
            landlord: req.user._id,
            title, description, location,
            beds, imageUrl, images, roomType,
            tenantPreferences, kitchen, floor, videoUrl, securityDeposit,
            facilities, kitchenAmenities, rules, rent,
            distanceCollege, distanceHospital, distanceMetro, distanceBusStand,
            distanceRailway, distanceMarket, noticePeriod, minimumStay, gateClosingTime,
            status: 'Pending'
        });

        const createdRoom = await room.save();
        
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { roles: 'Landlord' } });

        res.status(201).json(createdRoom);
    } catch (error) {
        console.error("Error in createRoom:", error);
        res.status(400).json({ message: 'Error creating room', error: error.message });
    }
});

// GET ALL ROOMS
exports.getAllRooms = asyncHandler(async (req, res) => {
    try {
        const keyword = req.query.keyword ? { "location.city": { $regex: req.query.keyword, $options: 'i' } } : {};
        const query = { ...keyword, status: 'Published' };
        const rooms = await Room.find(query);
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// SEARCH ROOMS 
exports.searchRooms = asyncHandler(async (req, res) => {
    try {
        const { latitude, longitude, radius, city, minRent, maxRent, beds, roomType } = req.body;
        let query = { status: 'Published' };

        if (latitude && longitude && radius) {
            const radiusInMeters = parseFloat(radius) * 1000;
            query.location = {
                $geoWithin: { $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], radiusInMeters / 6378100] }
            };
        }
        else if (city) {
            query['location.city'] = { $regex: city, $options: 'i' };
        }
        if (minRent || maxRent) {
            query.rent = {};
            if (minRent) query.rent.$gte = parseFloat(minRent);
            if (maxRent) query.rent.$lte = parseFloat(maxRent);
        }
        if (beds) { query.beds = parseInt(beds); }
        if (roomType) { query.roomType = roomType; }

        const rooms = await Room.find(query);
        res.status(200).json({
            message: `${rooms.length} rooms found.`,
            count: rooms.length,
            data: rooms
        });
    } catch (error) {
        console.error("Error in searchRooms:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});


// GET ROOM BY ID
exports.getRoomById = asyncHandler(async (req, res) => {
    try {
        // Use populate to fetch related landlord details, including name, email, and join date.
        const room = await Room.findById(req.params.id).populate('landlord', 'name email createdAt');
        
        if (room) {
            if (room.status === 'Published' && req.user?.roles && !req.user.roles.includes('Landlord')) {
                room.views = (room.views || 0) + 1;
                await room.save({ validateBeforeSave: false });
            }
            // The frontend expects the room object directly, not nested under a 'data' key.
            res.json(room);
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET MY ROOMS (for Landlord)
exports.getMyRooms = asyncHandler(async (req, res) => {
    try {
        const rooms = await Room.find({ landlord: req.user._id }).sort({ createdAt: -1 }).lean();
        const roomsWithStats = await Promise.all(
            rooms.map(async (room) => {
                const applicationCount = await Application.countDocuments({ room: room._id });
                return {
                    ...room,
                    stats: {
                        views: room.views || 0,
                        applications: applicationCount,
                        messages: applicationCount
                    }
                };
            })
        );
        res.json(roomsWithStats);
    } catch (error) {
        console.error("Error in getMyRooms:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});


// DELETE ROOM
exports.deleteRoom = asyncHandler(async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (room) {
            if (room.landlord.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: 'Not authorized' });
            }
            await room.deleteOne();
            res.json({ message: 'Room removed' });
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// UPDATE ROOM
exports.updateRoom = asyncHandler(async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        if (room.landlord.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const newRoomData = req.body;
        const majorFields = ['title', 'images', 'location', 'roomType'];
        let isMajorChange = false;

        for (const field of majorFields) {
            if (newRoomData[field] && JSON.stringify(newRoomData[field]) !== JSON.stringify(room[field])) {
                isMajorChange = true;
                break;
            }
        }
        if (!isMajorChange && newRoomData.rent && room.rent) {
            const rentChangePercentage = Math.abs(newRoomData.rent - room.rent) / room.rent;
            if (rentChangePercentage > 0.20) {
                isMajorChange = true;
            }
        }
        if (isMajorChange) {
            newRoomData.status = 'Pending';
        }

        const updatedRoom = await Room.findByIdAndUpdate(
            req.params.id,
            newRoomData,
            { new: true, runValidators: true }
        );
        res.json(updatedRoom);

    } catch (error) {
        console.error("Error in updateRoom:", error);
        res.status(400).json({ message: 'Error updating room', error: error.message });
    }
});


// Update Room Status
exports.updateRoomStatus = asyncHandler(async (req, res) => {
    try {
        const { status } = req.body;
        const room = await Room.findById(req.params.id);
        if (!room) { return res.status(404).json({ message: 'Room not found' }); }
        if (room.landlord.toString() !== req.user.id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }
        if (!['Published', 'Unpublished'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value.' });
        }
        if (status === 'Published' && room.status === 'Unpublished') {
            room.status = 'Pending';
        } else {
            room.status = status;
        }
        const updatedRoom = await room.save();
        res.status(200).json(updatedRoom);
    } catch (error) {
        console.error('Error updating room status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

//  Booking Functions 
exports.createBooking = asyncHandler(async (req, res) => {
    const { id: roomId } = req.params;
    const { message, occupants } = req.body;
    const studentId = req.user._id;

    // Find the room to ensure it exists and to get the landlord's ID.
    const room = await Room.findById(roomId);
    if (!room) {
        res.status(404);
        throw new Error('Room not found');
    }

    const landlordId = room.landlord;

    // Prevent a landlord from applying to their own room.
    if (landlordId.toString() === studentId.toString()) {
        res.status(400);
        throw new Error('You cannot apply to your own room.');
    }
    
    // Check if the user has already applied for this specific room.
    const existingApplication = await Application.findOne({
        room: roomId,
        student: studentId,
    });

    if (existingApplication) {
        res.status(400);
        throw new Error('You have already applied for this room.');
    }

    // If all checks pass, create the new application.
    const application = new Application({
        student: studentId,
        landlord: landlordId,
        room: roomId,
        message,
        occupants, // This should be an object e.g., { males: 1, females: 0 }
        status: 'Pending',
    });

    const createdApplication = await application.save();

    //Create a notification for the landlord about the new application.
    await Notification.create({
        user: landlordId,
        title: 'New Room Application!',
        message: `${req.user.name} has applied for your room: "${room.title}".`,
        link: `/landlord/inbox` // Or a dedicated applications page
    });

    // Send a success response back to the student.
    res.status(201).json(createdApplication);
});