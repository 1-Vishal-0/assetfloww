const { pool } = require('../config/database');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;

    const [rows] = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const [result] = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or access denied.' });
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;

    await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = ? OR user_id IS NULL`,
      [userId]
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
