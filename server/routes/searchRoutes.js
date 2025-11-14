// server/routes/searchRoutes.js

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Route: /api/search/autocomplete
router.get('/autocomplete', async (req, res) => {
  const searchText = req.query.text;
  if (!searchText) {
    return res.status(400).json({ message: 'Search text is required' });
  }

  try {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(searchText)}&apiKey=${apiKey}&filter=countrycode:in&limit=5`;
    
    const response = await axios.get(url);
    
    res.json(response.data);
  } catch (error) {
    console.error('Geoapify API Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch suggestions' });
  }
});

module.exports = router;