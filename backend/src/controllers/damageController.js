const { pool } = require('../config/database');

// POST /api/damages
const reportDamage = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { asset_id, description, severity = 'medium' } = req.body;
    const reported_by = req.user ? req.user.id : null;
    const photo_path = req.file ? `/uploads/${req.file.filename}` : null;

    if (!description || description.trim().length < 20) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Damage description must be at least 20 characters.' });
    }

    const [assetRows] = await connection.query('SELECT id, brand, model, serial_number FROM assets WHERE id = ?', [asset_id]);
    if (assetRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }
    const asset = assetRows[0];

    // Capitalise severity to match DB enum stored values
    const severityStored = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();

    const [result] = await connection.query(
      `INSERT INTO damage_reports (asset_id, reported_by, severity, description, photo_path, resolution_status)
       VALUES (?, ?, ?, ?, ?, 'Unresolved')`,
      [asset_id, reported_by, severityStored, description, photo_path]
    );

    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [reported_by, 'REPORT_DAMAGE', `Reported ${severityStored} damage for ${asset.brand} ${asset.model} (SN: ${asset.serial_number})`]
    );

    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (NULL, ?)',
      [`Damage Reported: ${asset.brand} ${asset.model} (SN: ${asset.serial_number}) — ${severityStored} severity.`]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Damage report submitted.', reportId: result.insertId });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// GET /api/damages
const getDamageReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, severity, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    const params = [];

    if (severity) { conditions.push('dr.severity = ?'); params.push(severity); }
    if (status)   { conditions.push('dr.resolution_status = ?'); params.push(status); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT
        dr.id, dr.asset_id, dr.severity, dr.description,
        dr.photo_path, dr.photo_path AS photo_url,
        dr.resolution_status, dr.resolution_status AS status,
        dr.created_at,
        CONCAT(a.brand, ' ', a.model) AS asset_name,
        a.serial_number,
        c.name AS category_name,
        u.email AS reported_by_email
      FROM damage_reports dr
      JOIN assets a ON dr.asset_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON dr.reported_by = u.id
      ${whereClause}
    `;

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${baseQuery}) AS c`, params);
    const [rows] = await pool.query(`${baseQuery} ORDER BY dr.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
};

// PUT /api/damages/:id/resolve
const resolveDamageReport = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const [existing] = await connection.query('SELECT dr.*, CONCAT(a.brand," ",a.model) AS asset_name FROM damage_reports dr JOIN assets a ON dr.asset_id=a.id WHERE dr.id=?', [id]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Damage report not found.' });
    }

    await connection.query(
      `UPDATE damage_reports SET resolution_status = 'Resolved', updated_at = NOW() WHERE id = ?`, [id]
    );
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'RESOLVE_DAMAGE', `Resolved damage report #${id} for ${existing[0].asset_name}`]
    );

    await connection.commit();
    res.json({ success: true, message: 'Damage report resolved.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// DELETE /api/damages/:id
const deleteDamageReport = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const [existing] = await connection.query('SELECT * FROM damage_reports WHERE id = ?', [id]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Damage report not found.' });
    }

    await connection.query('DELETE FROM damage_reports WHERE id = ?', [id]);
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'DELETE_DAMAGE_REPORT', `Deleted damage report #${id}`]
    );

    await connection.commit();
    res.json({ success: true, message: 'Damage report deleted.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = { reportDamage, getDamageReports, resolveDamageReport, deleteDamageReport };
