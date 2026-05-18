const { pool } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    // ── 1. Total Counts ────────────────────────────────────────────
    const [[{ total_assets }]] = await pool.query('SELECT COUNT(*) AS total_assets FROM assets');
    const [[{ total_employees }]] = await pool.query('SELECT COUNT(*) AS total_employees FROM employees');
    const [[{ total_damages }]] = await pool.query("SELECT COUNT(*) AS total_damages FROM damage_reports WHERE resolution_status = 'Unresolved'");

    // ── 2. Assets by derived status (dynamically evaluated) ────────
    const [statusRows] = await pool.query(`
      SELECT
        current_status,
        COUNT(*) AS cnt
      FROM (
        SELECT
          a.id,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM damage_reports dr
              WHERE dr.asset_id = a.id AND dr.resolution_status = 'Unresolved'
            ) THEN 'damaged'
            WHEN EXISTS (
              SELECT 1 FROM allocations al
              WHERE al.asset_id = a.id AND al.id NOT IN (SELECT allocation_id FROM returns)
            ) THEN 'allocated'
            ELSE 'in_stock'
          END AS current_status
        FROM assets a
      ) AS derived_statuses
      GROUP BY current_status
    `);

    const statusMap = { in_stock: 0, allocated: 0, damaged: 0 };
    statusRows.forEach(r => {
      statusMap[r.current_status] = Number(r.cnt);
    });

    // ── 3. Assets by category ──────────────────────────────────────
    const [byCategory] = await pool.query(`
      SELECT c.name AS category, COUNT(a.id) AS count
      FROM categories c
      LEFT JOIN assets a ON a.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `);

    // ── 4. Event counts by type (derived from transaction tables) ──
    const [[{ alloc_cnt }]] = await pool.query('SELECT COUNT(*) AS alloc_cnt FROM allocations');
    const [[{ ret_cnt }]] = await pool.query('SELECT COUNT(*) AS ret_cnt FROM returns');
    const [[{ dmg_cnt }]] = await pool.query('SELECT COUNT(*) AS dmg_cnt FROM damage_reports');

    const byEventType = [
      { event_type: 'allocated', count: alloc_cnt },
      { event_type: 'returned', count: ret_cnt },
      { event_type: 'damaged', count: dmg_cnt }
    ];

    // ── 5. Recent events (last 10 recent transactions UNION) ────────
    const [recentEvents] = await pool.query(`
      SELECT * FROM (
        (
          SELECT
            al.id,
            'allocated' AS event_type,
            al.allocated_at AS created_at,
            al.notes,
            CONCAT(a.brand, ' ', a.model) AS asset_name,
            a.serial_number,
            e.full_name AS employee_name
          FROM allocations al
          JOIN assets a ON al.asset_id = a.id
          JOIN employees e ON al.employee_id = e.id
        )
        UNION ALL
        (
          SELECT
            r.id,
            'returned' AS event_type,
            r.returned_at AS created_at,
            r.condition_notes AS notes,
            CONCAT(a.brand, ' ', a.model) AS asset_name,
            a.serial_number,
            e.full_name AS employee_name
          FROM returns r
          JOIN allocations al ON r.allocation_id = al.id
          JOIN assets a ON al.asset_id = a.id
          JOIN employees e ON al.employee_id = e.id
        )
        UNION ALL
        (
          SELECT
            dr.id,
            'damaged' AS event_type,
            dr.created_at,
            dr.description AS notes,
            CONCAT(a.brand, ' ', a.model) AS asset_name,
            a.serial_number,
            NULL AS employee_name
          FROM damage_reports dr
          JOIN assets a ON dr.asset_id = a.id
        )
      ) AS unified_timeline
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // ── 6. Low stock alert (categories with < 2 physically available assets in stock)
    const [lowStock] = await pool.query(`
      SELECT c.name AS category, COUNT(a.id) AS available_count
      FROM categories c
      LEFT JOIN assets a ON a.category_id = c.id AND a.id NOT IN (
        SELECT asset_id FROM allocations al WHERE al.id NOT IN (SELECT allocation_id FROM returns)
      ) AND a.id NOT IN (
        SELECT asset_id FROM damage_reports dr WHERE dr.resolution_status = 'Unresolved'
      )
      GROUP BY c.id, c.name
      HAVING available_count < 2
    `);

    res.json({
      success: true,
      data: {
        stats: {
          total_assets,
          in_stock: statusMap.in_stock,
          allocated: statusMap.allocated,
          damaged: statusMap.damaged,
          total_employees,
          total_damages,
        },
        byCategory,
        byEventType,
        recentEvents,
        lowStock,
      },
    });

  } catch (error) {
    console.error('Dashboard Stats Query Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };