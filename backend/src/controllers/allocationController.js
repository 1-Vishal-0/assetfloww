const { pool } = require('../config/database');

// POST /api/allocations
const allocateAsset = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { asset_id, employee_id, notes, expected_return_date } = req.body;
    const allocated_by = req.user ? req.user.id : null;

    const [assetRows] = await connection.query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM allocations al WHERE al.asset_id = a.id AND al.id NOT IN (SELECT allocation_id FROM returns)) AS active_alloc_count,
        (SELECT COUNT(*) FROM damage_reports dr WHERE dr.asset_id = a.id AND dr.resolution_status = 'Unresolved') AS damage_count
       FROM assets a WHERE a.id = ?`,
      [asset_id]
    );
    if (assetRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }
    const asset = assetRows[0];

    if (asset.active_alloc_count > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Asset is already allocated to another employee.' });
    }
    if (asset.damage_count > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Asset has an unresolved damage report. Resolve it before allocating.' });
    }

    const [employeeRows] = await connection.query('SELECT id, full_name FROM employees WHERE id = ?', [employee_id]);
    if (employeeRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    const employee = employeeRows[0];

    const parsedExpectedDate = expected_return_date ? expected_return_date.split('T')[0] : null;

    const [result] = await connection.query(
      `INSERT INTO allocations (asset_id, employee_id, allocated_by, expected_return_date, notes) VALUES (?, ?, ?, ?, ?)`,
      [asset_id, employee_id, allocated_by, parsedExpectedDate, notes || null]
    );

    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [allocated_by, 'ALLOCATE_ASSET', `Allocated ${asset.brand} ${asset.model} (SN: ${asset.serial_number}) to ${employee.full_name}`]
    );
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (NULL, ?)',
      [`Asset Allocated: ${asset.brand} ${asset.model} assigned to ${employee.full_name}.`]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Asset allocated successfully.', allocationId: result.insertId });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// GET /api/allocations
const getActiveAllocations = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const s = `%${search}%`;

    const baseQuery = `
      SELECT
        al.id, al.id AS event_id,
        al.asset_id, al.employee_id,
        al.notes, al.allocated_at, al.expected_return_date,
        CONCAT(a.brand, ' ', a.model) AS asset_name,
        a.serial_number, a.brand, a.model,
        c.name AS category_name,
        e.full_name AS employee_name,
        e.email AS employee_email,
        e.department
      FROM allocations al
      JOIN assets a ON al.asset_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      JOIN employees e ON al.employee_id = e.id
      WHERE al.id NOT IN (SELECT allocation_id FROM returns)
        AND (CONCAT(a.brand,' ',a.model) LIKE ? OR a.serial_number LIKE ? OR e.full_name LIKE ? OR e.department LIKE ?)
    `;
    const params = [s, s, s, s];

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${baseQuery}) AS c`, params);
    const [rows] = await pool.query(`${baseQuery} ORDER BY al.allocated_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
};

// DELETE /api/allocations/:id  — cancel/revoke an allocation (only if not yet returned)
const deleteAllocation = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    // Check exists and is still active (not already returned)
    const [rows] = await connection.query(
      `SELECT al.*, CONCAT(a.brand,' ',a.model) AS asset_name, e.full_name AS employee_name
       FROM allocations al
       JOIN assets a ON al.asset_id = a.id
       JOIN employees e ON al.employee_id = e.id
       WHERE al.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Allocation not found.' });
    }

    const [returnCheck] = await connection.query('SELECT id FROM returns WHERE allocation_id = ?', [id]);
    if (returnCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cannot delete an allocation that has already been returned. It is part of the audit history.' });
    }

    const alloc = rows[0];
    await connection.query('DELETE FROM allocations WHERE id = ?', [id]);
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'DELETE_ALLOCATION', `Revoked allocation of ${alloc.asset_name} from ${alloc.employee_name}`]
    );

    await connection.commit();
    res.json({ success: true, message: 'Allocation revoked successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = { allocateAsset, getActiveAllocations, deleteAllocation };
