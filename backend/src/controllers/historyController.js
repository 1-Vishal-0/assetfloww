const { pool } = require('../config/database');

// GET /api/history/assets/:id
const getAssetHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [assetRows] = await pool.query(
      `SELECT a.*, c.name AS category_name, CONCAT(a.brand, ' ', a.model) AS asset_name
       FROM assets a LEFT JOIN categories c ON a.category_id = c.id WHERE a.id = ?`,
      [id]
    );
    if (assetRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    const [events] = await pool.query(`
      (
        SELECT
          al.id AS event_id,
          'allocated' AS event_type,
          al.notes,
          al.allocated_at AS created_at,
          al.allocated_at AS timestamp,
          e.id AS employee_id,
          e.full_name AS employee_name,
          e.email AS employee_email,
          e.department,
          NULL AS severity,
          NULL AS damage_description,
          NULL AS photo_url
        FROM allocations al
        JOIN employees e ON al.employee_id = e.id
        WHERE al.asset_id = ?
      )
      UNION ALL
      (
        SELECT
          r.id AS event_id,
          'returned' AS event_type,
          r.condition_notes AS notes,
          r.returned_at AS created_at,
          r.returned_at AS timestamp,
          e.id AS employee_id,
          e.full_name AS employee_name,
          e.email AS employee_email,
          e.department,
          NULL AS severity,
          NULL AS damage_description,
          NULL AS photo_url
        FROM returns r
        JOIN allocations al ON r.allocation_id = al.id
        JOIN employees e ON al.employee_id = e.id
        WHERE al.asset_id = ?
      )
      UNION ALL
      (
        SELECT
          dr.id AS event_id,
          'damaged' AS event_type,
          dr.description AS notes,
          dr.created_at AS created_at,
          dr.created_at AS timestamp,
          NULL AS employee_id,
          NULL AS employee_name,
          NULL AS employee_email,
          NULL AS department,
          dr.severity,
          dr.description AS damage_description,
          dr.photo_path AS photo_url
        FROM damage_reports dr
        WHERE dr.asset_id = ?
      )
      ORDER BY timestamp DESC
    `, [id, id, id]);

    res.json({ success: true, asset: assetRows[0], events });
  } catch (err) {
    next(err);
  }
};

// GET /api/history/employees/:id
const getEmployeeHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [employeeRows] = await pool.query('SELECT *, full_name AS name FROM employees WHERE id = ?', [id]);
    if (employeeRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const [events] = await pool.query(`
      (
        SELECT
          al.id AS event_id,
          'allocated' AS event_type,
          al.notes,
          al.allocated_at AS created_at,
          al.allocated_at AS timestamp,
          a.id AS asset_id,
          CONCAT(a.brand, ' ', a.model) AS asset_name,
          a.serial_number,
          a.model,
          c.name AS category_name
        FROM allocations al
        JOIN assets a ON al.asset_id = a.id
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE al.employee_id = ?
      )
      UNION ALL
      (
        SELECT
          r.id AS event_id,
          'returned' AS event_type,
          r.condition_notes AS notes,
          r.returned_at AS created_at,
          r.returned_at AS timestamp,
          a.id AS asset_id,
          CONCAT(a.brand, ' ', a.model) AS asset_name,
          a.serial_number,
          a.model,
          c.name AS category_name
        FROM returns r
        JOIN allocations al ON r.allocation_id = al.id
        JOIN assets a ON al.asset_id = a.id
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE al.employee_id = ?
      )
      ORDER BY timestamp DESC
    `, [id, id]);

    res.json({ success: true, employee: employeeRows[0], events });
  } catch (err) {
    next(err);
  }
};

// GET /api/history — Paginated logs
const getAllHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 15, event_type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let baseQuery = `
      SELECT * FROM (
        (
          SELECT
            al.id AS event_id,
            'allocated' AS event_type,
            al.notes,
            al.allocated_at AS created_at,
            al.allocated_at AS timestamp,
            CONCAT(a.brand, ' ', a.model) AS asset_name,
            a.serial_number,
            c.name AS category_name,
            e.full_name AS employee_name,
            e.department
          FROM allocations al
          JOIN assets a ON al.asset_id = a.id
          LEFT JOIN categories c ON a.category_id = c.id
          JOIN employees e ON al.employee_id = e.id
        )
        UNION ALL
        (
          SELECT
            r.id AS event_id,
            'returned' AS event_type,
            r.condition_notes AS notes,
            r.returned_at AS created_at,
            r.returned_at AS timestamp,
            CONCAT(a.brand, ' ', a.model) AS asset_name,
            a.serial_number,
            c.name AS category_name,
            e.full_name AS employee_name,
            e.department
          FROM returns r
          JOIN allocations al ON r.allocation_id = al.id
          JOIN assets a ON al.asset_id = a.id
          LEFT JOIN categories c ON a.category_id = c.id
          JOIN employees e ON al.employee_id = e.id
        )
        UNION ALL
        (
          SELECT
            dr.id AS event_id,
            'damaged' AS event_type,
            dr.description AS notes,
            dr.created_at AS created_at,
            dr.created_at AS timestamp,
            CONCAT(a.brand, ' ', a.model) AS asset_name,
            a.serial_number,
            c.name AS category_name,
            NULL AS employee_name,
            NULL AS department
          FROM damage_reports dr
          JOIN assets a ON dr.asset_id = a.id
          LEFT JOIN categories c ON a.category_id = c.id
        )
      ) AS unified_events
    `;

    const params = [];
    if (event_type) {
      baseQuery += ` WHERE event_type = ?`;
      params.push(event_type);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM (${baseQuery}) AS counts`,
      params
    );
    const total = countRows[0].total;

    baseQuery += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(baseQuery, params);

    res.json({
      success: true,
      data: rows.map(r => ({ ...r, id: r.event_id })), // Map event_id as standard key
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAssetHistory, getEmployeeHistory, getAllHistory };
