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

// Check if user has a confirmed/seated reservation
exports.checkEligibility = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await db.execute(
            "SELECT * FROM reservations WHERE user_id = ? AND status IN ('Confirmed', 'Seated') LIMIT 1",
            [userId]
        );
        res.json({ canReview: rows.length > 0 });
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