const { pool } = require('../config/database');

// GET /api/employees — search employees
const getEmployees = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const searchParam = `%${search}%`;

    const [rows] = await pool.query(
      `SELECT id, employee_code, full_name, full_name AS name, department, designation, email, phone, profile_image, created_at
       FROM employees
       WHERE full_name LIKE ? OR email LIKE ? OR department LIKE ? OR designation LIKE ? OR employee_code LIKE ?
       ORDER BY full_name ASC`,
      [searchParam, searchParam, searchParam, searchParam, searchParam]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, employee_code, full_name, full_name AS name, department, designation, email, phone, profile_image, created_at
       FROM employees WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/employees
const createEmployee = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { name, full_name, email, department, designation, phone, employee_code, profile_image } = req.body;

    const parsedFullName = full_name || name;
    if (!parsedFullName) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Employee name is required' });
    }

    const parsedCode = employee_code || `EMP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const parsedDesignation = designation || 'Associate';

    // Check unique email
    const [existingEmail] = await connection.query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Email address already registered.' });
    }

    // Check unique employee code
    const [existingCode] = await connection.query('SELECT id FROM employees WHERE employee_code = ?', [parsedCode]);
    if (existingCode.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Employee code already exists.' });
    }

    const [result] = await connection.query(
      `INSERT INTO employees (employee_code, full_name, department, designation, email, phone, profile_image)
       VALUES (?,?,?,?,?,?,?)`,
      [parsedCode, parsedFullName, department, parsedDesignation, email, phone || null, profile_image || null]
    );

    // Log Activity
    const userId = req.user ? req.user.id : null;
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'CREATE_EMPLOYEE', `Created employee ${parsedFullName} (${parsedCode})`]
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      employeeId: result.insertId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { name, full_name, email, department, designation, phone, employee_code, profile_image } = req.body;

    const [existing] = await connection.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const currentEmployee = existing[0];
    const parsedFullName = full_name || name || currentEmployee.full_name;
    const parsedCode = employee_code || currentEmployee.employee_code;
    const parsedDesignation = designation || currentEmployee.designation;

    // Check unique email if changed
    if (email && email !== currentEmployee.email) {
      const [existingEmail] = await connection.query('SELECT id FROM employees WHERE email = ?', [email]);
      if (existingEmail.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Email address already registered.' });
      }
    }

    // Check unique employee code if changed
    if (parsedCode && parsedCode !== currentEmployee.employee_code) {
      const [existingCode] = await connection.query('SELECT id FROM employees WHERE employee_code = ?', [parsedCode]);
      if (existingCode.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Employee code already exists.' });
      }
    }

    await connection.query(
      `UPDATE employees
       SET employee_code = ?, full_name = ?, department = ?, designation = ?, email = ?, phone = ?, profile_image = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        parsedCode,
        parsedFullName,
        department || currentEmployee.department,
        parsedDesignation,
        email || currentEmployee.email,
        phone !== undefined ? phone : currentEmployee.phone,
        profile_image !== undefined ? profile_image : currentEmployee.profile_image,
        id
      ]
    );

    // Log Activity
    const userId = req.user ? req.user.id : null;
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'UPDATE_EMPLOYEE', `Updated employee ${parsedFullName} (${parsedCode})`]
    );

    await connection.commit();
    res.json({ success: true, message: 'Employee updated successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [existing] = await connection.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const employee = existing[0];

    // Check if employee currently holds any allocated assets
    const [activeAllocations] = await connection.query(
      `SELECT al.id FROM allocations al
       WHERE al.employee_id = ? AND al.id NOT IN (SELECT allocation_id FROM returns)`,
      [id]
    );

    if (activeAllocations.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an employee who currently has active asset allocations.'
      });
    }

    await connection.query('DELETE FROM employees WHERE id = ?', [id]);

    // Log Activity
    const userId = req.user ? req.user.id : null;
    await connection.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'DELETE_EMPLOYEE', `Deleted employee ${employee.full_name} (${employee.employee_code})`]
    );

    await connection.commit();
    res.json({ success: true, message: 'Employee deleted successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };
