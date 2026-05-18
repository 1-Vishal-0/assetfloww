const { pool } = require('../config/database');

// GET /api/assets — with search, filter, pagination
const getAssets = async (req, res, next) => {
  try {
    const { search = '', category_id, status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchParam = `%${search}%`;

    let queryBase = `
      SELECT * FROM (
        SELECT
          a.id, a.serial_number, a.asset_tag, a.category_id, a.brand, a.model,
          a.purchase_date, a.warranty_expiry, a.location, a.condition, a.created_at,
          c.name AS category_name,
          CONCAT(a.brand, ' ', a.model) AS asset_name,
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
          END AS current_status,
          (
            SELECT e.full_name FROM allocations al
            JOIN employees e ON al.employee_id = e.id
            WHERE al.asset_id = a.id AND al.id NOT IN (SELECT allocation_id FROM returns)
            ORDER BY al.allocated_at DESC LIMIT 1
          ) AS allocated_to,
          (
            SELECT e.id FROM allocations al
            JOIN employees e ON al.employee_id = e.id
            WHERE al.asset_id = a.id AND al.id NOT IN (SELECT allocation_id FROM returns)
            ORDER BY al.allocated_at DESC LIMIT 1
          ) AS allocated_to_id
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
      ) AS derived_assets
      WHERE (asset_name LIKE ? OR serial_number LIKE ? OR asset_tag LIKE ? OR location LIKE ? OR category_name LIKE ?)
    `;

    const params = [searchParam, searchParam, searchParam, searchParam, searchParam];

    if (category_id) {
      queryBase += ` AND category_id = ?`;
      params.push(category_id);
    }

    if (status && status !== 'all') {
      queryBase += ` AND current_status = ?`;
      params.push(status);
    }

    // Count total rows matching criteria
    const countQuery = `SELECT COUNT(*) AS total FROM (${queryBase}) AS counts`;
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    // Apply pagination
    queryBase += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(queryBase, params);

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

// GET /api/assets/:id
const getAssetById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.id, a.serial_number, a.asset_tag, a.category_id, a.brand, a.model,
        a.purchase_date, a.warranty_expiry, a.location, a.condition, a.created_at,
        c.name AS category_name,
        CONCAT(a.brand, ' ', a.model) AS asset_name,
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
        END AS current_status,
        (
          SELECT e.full_name FROM allocations al
          JOIN employees e ON al.employee_id = e.id
          WHERE al.asset_id = a.id AND al.id NOT IN (SELECT allocation_id FROM returns)
          ORDER BY al.allocated_at DESC LIMIT 1
        ) AS allocated_to,
        (
          SELECT e.id FROM allocations al
          JOIN employees e ON al.employee_id = e.id
          WHERE al.asset_id = a.id AND al.id NOT IN (SELECT allocation_id FROM returns)
          ORDER BY al.allocated_at DESC LIMIT 1
        ) AS allocated_to_id
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/assets
const createAsset = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const {
      asset_name,
      serial_number,
      model,
      category_id,
      purchase_date,
      location,
      brand,
      asset_tag,
      warranty_expiry,
      condition = 'Good'
    } = req.body;

    // Smart parsing for backward compatibility
    const parsedBrand = brand || asset_name.split(' ')[0] || 'Unknown';
    const parsedModel = model || asset_name.replace(parsedBrand, '').trim() || 'Model';
    const parsedTag = asset_tag || `TAG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Set default purchase_date if empty
    const pDate = purchase_date ? purchase_date.split('T')[0] : new Date().toISOString().split('T')[0];

    // Compute warranty_expiry (default to 3 years from purchase)
    let wExpiry = warranty_expiry;
    if (!wExpiry) {
      const d = new Date(pDate);
      d.setFullYear(d.getFullYear() + 3);
      wExpiry = d.toISOString().split('T')[0];
    } else {
      wExpiry = wExpiry.split('T')[0];
    }

    // Validate unique serial number at database level
    const [existingSerial] = await connection.query(
      'SELECT id FROM assets WHERE serial_number = ?',
      [serial_number]
    );
    if (existingSerial.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Serial number already exists.' });
    }

    // Validate unique asset tag at database level
    const [existingTag] = await connection.query(
      'SELECT id FROM assets WHERE asset_tag = ?',
      [parsedTag]
    );
    if (existingTag.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Asset tag already exists.' });
    }

    const [result] = await connection.query(
      `INSERT INTO assets (serial_number, asset_tag, category_id, brand, model, purchase_date, warranty_expiry, location, \`condition\`)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [serial_number, parsedTag, category_id, parsedBrand, parsedModel, pDate, wExpiry, location || 'Office HQ', condition]
    );

    const assetId = result.insertId;

    // Log Activity
    const userId = req.user ? req.user.id : null;
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'CREATE_ASSET', `Added asset ${parsedBrand} ${parsedModel} (${serial_number})`]
    );

    // Create Notification
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (NULL, ?)',
      [`New asset added: ${parsedBrand} ${parsedModel} (SN: ${serial_number})`]
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Asset created successfully.',
      assetId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// PUT /api/assets/:id
const updateAsset = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const {
      asset_name,
      serial_number,
      model,
      category_id,
      purchase_date,
      location,
      brand,
      asset_tag,
      warranty_expiry,
      condition
    } = req.body;

    const [existing] = await connection.query('SELECT * FROM assets WHERE id = ?', [id]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    const currentAsset = existing[0];

    // Smart parsing for backward compatibility
    const parsedBrand = brand || (asset_name ? asset_name.split(' ')[0] : currentAsset.brand);
    const parsedModel = model || (asset_name ? asset_name.replace(parsedBrand, '').trim() : currentAsset.model);
    const parsedTag = asset_tag || currentAsset.asset_tag;
    const pDate = purchase_date ? purchase_date.split('T')[0] : currentAsset.purchase_date;
    const wExpiry = warranty_expiry ? warranty_expiry.split('T')[0] : currentAsset.warranty_expiry;
    const parsedCondition = condition || currentAsset.condition;

    // Validate unique serial number if changed
    if (serial_number && serial_number !== currentAsset.serial_number) {
      const [existingSerial] = await connection.query(
        'SELECT id FROM assets WHERE serial_number = ?',
        [serial_number]
      );
      if (existingSerial.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Serial number already exists.' });
      }
    }

    // Validate unique asset tag if changed
    if (parsedTag && parsedTag !== currentAsset.asset_tag) {
      const [existingTag] = await connection.query(
        'SELECT id FROM assets WHERE asset_tag = ?',
        [parsedTag]
      );
      if (existingTag.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Asset tag already exists.' });
      }
    }

    await connection.query(
      `UPDATE assets
       SET serial_number = ?, asset_tag = ?, category_id = ?, brand = ?, model = ?, purchase_date = ?, warranty_expiry = ?, location = ?, \`condition\` = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        serial_number || currentAsset.serial_number,
        parsedTag,
        category_id || currentAsset.category_id,
        parsedBrand,
        parsedModel,
        pDate,
        wExpiry,
        location || currentAsset.location,
        parsedCondition,
        id
      ]
    );

    // Log Activity
    const userId = req.user ? req.user.id : null;
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'UPDATE_ASSET', `Updated asset ${parsedBrand} ${parsedModel} (${serial_number || currentAsset.serial_number})`]
    );

    await connection.commit();
    res.json({ success: true, message: 'Asset updated successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// DELETE /api/assets/:id
const deleteAsset = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [existing] = await connection.query(
      `SELECT a.*,
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
       FROM assets a WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    const asset = existing[0];

    if (asset.current_status === 'allocated') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an allocated asset. Please process a return first.'
      });
    }

    await connection.query('DELETE FROM assets WHERE id = ?', [id]);

    // Log Activity
    const userId = req.user ? req.user.id : null;
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'DELETE_ASSET', `Deleted asset ${asset.brand} ${asset.model} (SN: ${asset.serial_number})`]
    );

    await connection.commit();
    res.json({ success: true, message: 'Asset deleted successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = { getAssets, getAssetById, createAsset, updateAsset, deleteAsset };
