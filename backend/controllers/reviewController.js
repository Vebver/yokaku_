const db = require('../config/db');

// Get all reviews to show on the page
exports.getReviews = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.*, u.first_name, u.last_name 
            FROM reviews r 
            JOIN users u ON r.user_id = u.user_id 
            WHERE r.rating >= 4
            ORDER BY r.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Check if user has a seated or completed reservation and has remaining review credits
exports.checkEligibility = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Count the number of seated/completed reservations
        const [resRows] = await db.execute(
            "SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND status IN ('Seated', 'Completed')",
            [userId]
        );
        const reservationCount = resRows[0]?.count || 0;

        // 2. Count the number of reviews the user has already submitted
        const [reviewRows] = await db.execute(
            "SELECT COUNT(*) as count FROM reviews WHERE user_id = ?",
            [userId]
        );
        const reviewCount = reviewRows[0]?.count || 0;

        // 3. Eligible if they have more completed/seated sessions than submitted reviews
        res.json({ canReview: reservationCount > reviewCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Save a new review
exports.postReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const userId = req.user.userId;
        await db.execute(
            "INSERT INTO reviews (user_id, rating, comment) VALUES (?, ?, ?)",
            [userId, rating, comment]
        );
        res.json({ message: "Review posted! Thank you." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};