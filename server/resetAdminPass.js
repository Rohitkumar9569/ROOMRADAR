// server/resetAdminPass.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); 

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected for password reset')).catch(err => console.log(err));

const resetAdminPassword = async (email, newPassword) => {
    try {
        const adminUser = await User.findOne({ email, role: 'Admin' });

        if (!adminUser) {
            console.log('Admin user not found!');
            mongoose.disconnect();
            return;
        }

        const salt = await bcrypt.genSalt(10);
        adminUser.password = await bcrypt.hash(newPassword, salt);

        await adminUser.save();
        console.log('Admin password reset successfully!');
        mongoose.disconnect(); 
    } catch (error) {
        console.error('Error resetting admin password:', error);
        mongoose.disconnect();
    }
};

resetAdminPassword('rohit123@gmail.com', 'rohit1234');  

// node resetAdminPass.js