const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getCategories, createCategory } = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', auth, getCategories);
router.post('/', auth, [body('name').trim().notEmpty().withMessage('Category name is required')], validate, createCategory);

module.exports = router;
