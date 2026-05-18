const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { allocateAsset, getActiveAllocations } = require('../controllers/allocationController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', auth, getActiveAllocations);

router.post('/',
  auth,
  [
    body('asset_id').isInt({ min: 1 }).withMessage('Valid asset ID is required'),
    body('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  ],
  validate,
  allocateAsset
);

module.exports = router;
