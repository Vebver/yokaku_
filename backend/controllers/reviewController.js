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

        // 1. Get the date of the user's LATEST completed/seated reservation
        const [resRows] = await db.execute(
            `SELECT created_at 
             FROM reservations 
             WHERE user_id = ? AND status IN ('Seated', 'Completed') 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userId]
        );

        // If they have never completed a reservation, they cannot review
        if (resRows.length === 0) {
            return res.json({ canReview: false });
        }

        const latestReservationTime = new Date(resRows[0].created_at);

        // 2. Get the date of the user's LATEST submitted review
        const [reviewRows] = await db.execute(
            `SELECT created_at 
             FROM reviews 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userId]
        );

        // If they have never written a review, they are eligible
        if (reviewRows.length === 0) {
            return res.json({ canReview: true });
        }

        const latestReviewTime = new Date(reviewRows[0].created_at);

        // Eligible ONLY if their latest booking is newer than their latest review
        res.json({ canReview: latestReservationTime > latestReviewTime });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Save a new review
exports.postReview = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { rating, comment } = req.body;

        // 1. Get latest reservation time
        const [resRows] = await db.execute(
            `SELECT created_at FROM reservations 
             WHERE user_id = ? AND status IN ('Seated', 'Completed') 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (resRows.length === 0) {
            return res.status(403).json({ error: "You must complete a reservation to leave a review." });
        }

        const latestReservationTime = new Date(resRows[0].created_at);

        // 2. Get latest review time
        const [reviewRows] = await db.execute(
            `SELECT created_at FROM reviews 
             WHERE user_id = ? 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (reviewRows.length > 0) {
            const latestReviewTime = new Date(reviewRows[0].created_at);
            // Block if they have already reviewed their latest experience
            if (latestReservationTime <= latestReviewTime) {
                return res.status(403).json({ error: "You have already reviewed your latest reservation." });
            }
        }

        // 3. Save the review using your existing columns (no schema changes needed)
        await db.execute(
            "INSERT INTO reviews (user_id, rating, comment, created_at) VALUES (?, ?, ?, NOW())",
            [userId, rating, comment]
        );

        res.status(201).json({ success: true, message: "Feedback submitted successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};