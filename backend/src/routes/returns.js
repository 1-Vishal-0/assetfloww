const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { returnAsset, getReturns } = require('../controllers/returnController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', auth, getReturns);

router.post('/',
  auth,
  [body('asset_id').isInt({ min: 1 }).withMessage('Valid asset ID is required')],
  validate,
  returnAsset
);

module.exports = router;
