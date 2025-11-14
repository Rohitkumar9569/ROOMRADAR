const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); 

dotenv.config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected for admin creation...'))
    .catch(err => console.error('MongoDB connection error:', err));

const createAdminUser = async (email, password) => {
    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log(`An account with this email already exists.`);
            mongoose.disconnect();
            return;
        }

        const adminUser = new User({
            name: 'Admin',
            email: email,
            password: password,
           
            roles: ['Admin'] 
        });

        await adminUser.save();
        console.log('✅ Admin user created successfully with only the Admin role!');
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        mongoose.disconnect();
    }
};

// --- Add your desired admin email and password here ---
createAdminUser('admin@roomradar.com', 'adminpass123');