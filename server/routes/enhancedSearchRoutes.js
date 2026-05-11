const express = require('express');
const router = express.Router();
const enhancedSearchController = require('../controllers/enhancedSearchController');

// Advanced search with filters
router.post('/advanced', enhancedSearchController.advancedSearch);

// Get trending searches
router.get('/trending', enhancedSearchController.getTrendingSearches);

// Get search suggestions
router.get('/suggestions', enhancedSearchController.getSearchSuggestions);

// Get similar rooms
router.get('/similar/:roomId', enhancedSearchController.getSimilarRooms);

// Get search filters metadata
router.get('/filters', enhancedSearchController.getSearchFilters);

// Location autocomplete
router.get('/autocomplete', enhancedSearchController.locationAutocomplete);

module.exports = router;
