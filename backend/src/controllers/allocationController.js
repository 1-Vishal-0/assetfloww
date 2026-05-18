const { pool } = require('../config/database');

// POST /api/allocations — Allocate asset to employee
const allocateAsset = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { asset_id, employee_id, notes, expected_return_date } = req.body;
    const allocated_by = req.user ? req.user.id : null;

    // Check asset exists
    const [assetRows] = await connection.query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM allocations al WHERE al.asset_id = a.id AND al.id NOT IN (SELECT allocation_id FROM returns)) AS active_allocation_count,
        (SELECT COUNT(*) FROM damage_reports dr WHERE dr.asset_id = a.id AND dr.resolution_status = 'Unresolved') AS unresolved_damage_count
       FROM assets a WHERE a.id = ?`,
      [asset_id]
    );

    if (assetRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    const asset = assetRows[0];

    // Business rule validations: Cannot allocate unavailable asset
    if (asset.active_allocation_count > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Asset is already allocated. The same asset cannot be allocated twice.'
      });
    }

    if (asset.unresolved_damage_count > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Asset is currently reported damaged. Please resolve the damage report before allocating.'
      });
    }

    // Check employee exists
    const [employeeRows] = await connection.query('SELECT id, full_name FROM employees WHERE id = ?', [employee_id]);
    if (employeeRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const employee = employeeRows[0];

    // Parse dates
    const parsedExpectedDate = expected_return_date ? expected_return_date.split('T')[0] : null;

    // Insert into allocations
    const [result] = await connection.query(
      `INSERT INTO allocations (asset_id, employee_id, allocated_by, expected_return_date, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [asset_id, employee_id, allocated_by, parsedExpectedDate, notes || null]
    );

    // Log Activity
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [allocated_by, 'ALLOCATE_ASSET', `Allocated asset ${asset.brand} ${asset.model} (SN: ${asset.serial_number}) to ${employee.full_name}`]
    );

    // Trigger Notification
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (NULL, ?)',
      [`Asset Allocated: ${asset.brand} ${asset.model} (SN: ${asset.serial_number}) has been assigned to ${employee.full_name}.`]
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Asset allocated successfully.',
      allocationId: result.insertId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// GET /api/allocations — Active allocations list
const getActiveAllocations = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchParam = `%${search}%`;

    const baseQuery = `
      SELECT
        al.id AS id,
        al.id AS event_id,
        al.asset_id,
        al.employee_id,
        al.notes,
        al.allocated_at,
        al.expected_return_date,
        CONCAT(a.brand, ' ', a.model) AS asset_name,
        a.serial_number,
        a.model,
        c.name AS category_name,
        e.full_name AS employee_name,
        e.email AS employee_email,
        e.department
      FROM allocations al
      JOIN assets a ON al.asset_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      JOIN employees e ON al.employee_id = e.id
      WHERE al.id NOT IN (SELECT allocation_id FROM returns)
        AND (a.brand LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ? OR e.full_name LIKE ? OR e.department LIKE ?)
    `;

    const params = [searchParam, searchParam, searchParam, searchParam, searchParam];

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS counts`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `${baseQuery} ORDER BY al.allocated_at DESC LIMIT ? OFFSET ?`,
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

module.exports = { allocateAsset, getActiveAllocations };
