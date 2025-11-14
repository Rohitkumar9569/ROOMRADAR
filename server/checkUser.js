// server/checkUser.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected for user check')).catch(err => console.log(err));

const findUser = async (email) => {
    try {
        const user = await User.findOne({ email });
        if (user) {
            console.log('--- User found in database ---');
            console.log(user);
        } else {
            console.log(`User not found with email: ${email}`);
        }
    } catch (error) {
        console.error('Error finding user:', error);
    } finally {
        mongoose.disconnect();
    }
};

findUser('rohit1234@gmail.com');