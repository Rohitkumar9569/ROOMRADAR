const express = require('express');
const axios = require('axios');
const router = express.Router();

// Path is now just '/autocomplete'
router.get('/autocomplete', async (req, res) => {
    const { text } = req.query;
    const apiKey = process.env.GEOAPIFY_API_KEY;

    if (!text) {
        return res.status(400).json({ message: 'Search text is required' });
    }
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${text}&apiKey=${apiKey}&filter=countrycode:in&bias=countrycode:in&limit=5`;
    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching from Geoapify:", error.message);
        res.status(500).json({ message: "Failed to fetch suggestions from server" });
    }
});

//Path is now just '/reverse'
router.get('/reverse', async (req, res) => {
    const { lat, lon } = req.query;
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!lat || !lon) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`;
    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching from Geoapify reverse:", error.message);
        res.status(500).json({ message: "Failed to fetch address from server" });
    }
});

module.exports = router;