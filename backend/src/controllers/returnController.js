const { pool } = require('../config/database');

// POST /api/returns — Process an asset return
const returnAsset = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { asset_id, notes } = req.body;
    const received_by = req.user ? req.user.id : null;

    // Check asset exists
    const [assetRows] = await connection.query('SELECT id, brand, model, serial_number FROM assets WHERE id = ?', [asset_id]);
    if (assetRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    const asset = assetRows[0];

    // Find active allocation for this asset: Cannot return unallocated asset
    const [allocationRows] = await connection.query(
      `SELECT al.id, al.employee_id, e.full_name AS employee_name
       FROM allocations al
       JOIN employees e ON al.employee_id = e.id
       WHERE al.asset_id = ? AND al.id NOT IN (SELECT allocation_id FROM returns)
       ORDER BY al.allocated_at DESC LIMIT 1`,
      [asset_id]
    );

    if (allocationRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot return asset. Asset is not currently allocated.'
      });
    }

    const allocation = allocationRows[0];

    // Insert into returns
    const [result] = await connection.query(
      `INSERT INTO returns (allocation_id, condition_notes, received_by)
       VALUES (?, ?, ?)`,
      [allocation.id, notes || null, received_by]
    );

    // Log Activity
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [received_by, 'RETURN_ASSET', `Processed return of asset ${asset.brand} ${asset.model} (SN: ${asset.serial_number}) from ${allocation.employee_name}`]
    );

    // Trigger Notification
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (NULL, ?)',
      [`Asset Returned: ${asset.brand} ${asset.model} (SN: ${asset.serial_number}) was returned by ${allocation.employee_name}.`]
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Asset returned successfully.',
      returnId: result.insertId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// GET /api/returns — Returns list
const getReturns = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchParam = `%${search}%`;

    const baseQuery = `
      SELECT
        r.id AS id,
        r.id AS event_id,
        al.asset_id,
        al.employee_id,
        r.condition_notes AS notes,
        r.returned_at,
        CONCAT(a.brand, ' ', a.model) AS asset_name,
        a.serial_number,
        a.model,
        c.name AS category_name,
        e.full_name AS employee_name,
        e.email AS employee_email,
        e.department
      FROM returns r
      JOIN allocations al ON r.allocation_id = al.id
      JOIN assets a ON al.asset_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      JOIN employees e ON al.employee_id = e.id
      WHERE (a.brand LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ? OR e.full_name LIKE ?)
    `;

    const params = [searchParam, searchParam, searchParam, searchParam];

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS counts`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `${baseQuery} ORDER BY r.returned_at DESC LIMIT ? OFFSET ?`,
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

module.exports = { returnAsset, getReturns };
