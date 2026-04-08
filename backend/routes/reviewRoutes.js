const express = require('express');
const router = express.Router();
const {getReviews, checkEligibility, postReview} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.get("/", getReviews);
router.get("/eligibility", protect, checkEligibility);
router.post("/", protect, postReview);

module.exports = router;