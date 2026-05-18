const { pool } = require('../config/database');

const getCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ success: true, message: 'Category created.', categoryId: result.insertId });
  } catch (err) { next(err); }
};

module.exports = { getCategories, createCategory };
