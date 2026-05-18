const { pool } = require('../config/database');

// POST /api/damages — Report asset damage
const reportDamage = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { asset_id, description, severity = 'Medium' } = req.body;
    const reported_by = req.user ? req.user.id : null;
    const photo_path = req.file ? `/uploads/${req.file.filename}` : null;

    // Enforce backend validation: Description is required and must be >= 20 characters
    if (!description || description.trim().length < 20) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Damage description is required and must be at least 20 characters long.'
      });
    }

    // Check asset exists
    const [assetRows] = await connection.query('SELECT id, brand, model, serial_number FROM assets WHERE id = ?', [asset_id]);
    if (assetRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    const asset = assetRows[0];

    // Insert into damage_reports
    const [result] = await connection.query(
      `INSERT INTO damage_reports (asset_id, reported_by, severity, description, photo_path, resolution_status)
       VALUES (?, ?, ?, ?, ?, 'Unresolved')`,
      [asset_id, reported_by, severity, description, photo_path]
    );

    // Log Activity
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [reported_by, 'REPORT_DAMAGE', `Reported ${severity} damage for asset ${asset.brand} ${asset.model} (SN: ${asset.serial_number})`]
    );

    // Trigger Notification
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (NULL, ?)',
      [`Damage Reported: ${asset.brand} ${asset.model} (SN: ${asset.serial_number}) reported with ${severity} severity: "${description.substring(0, 50)}..."`]
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Damage report submitted successfully.',
      reportId: result.insertId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// GET /api/damages — List damage reports
const getDamageReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, severity } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let baseQuery = `
      SELECT
        dr.id,
        dr.asset_id,
        dr.reported_by,
        dr.severity,
        dr.description,
        dr.photo_path,
        dr.photo_path AS photo_url,
        dr.resolution_status,
        dr.resolution_status AS status, -- for backward compatibility
        dr.created_at,
        CONCAT(a.brand, ' ', a.model) AS asset_name,
        a.serial_number,
        c.name AS category_name,
        u.email AS reported_by_email
      FROM damage_reports dr
      JOIN assets a ON dr.asset_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON dr.reported_by = u.id
    `;

    const params = [];

    if (severity) {
      baseQuery += ` WHERE dr.severity = ?`;
      params.push(severity);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS counts`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `${baseQuery} ORDER BY dr.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { reportDamage, getDamageReports };
