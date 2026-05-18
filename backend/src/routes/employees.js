const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const empValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
];

router.get('/', auth, getEmployees);
router.get('/:id', auth, getEmployeeById);
router.post('/', auth, empValidation, validate, createEmployee);
router.put('/:id', auth, empValidation, validate, updateEmployee);
router.delete('/:id', auth, deleteEmployee);

module.exports = router;
