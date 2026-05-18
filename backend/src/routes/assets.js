const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getAssets, getAssetById, createAsset, updateAsset, deleteAsset } = require('../controllers/assetController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const assetValidation = [
  body('asset_name').trim().notEmpty().withMessage('Asset name is required'),
  body('serial_number').trim().notEmpty().withMessage('Serial number is required'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category is required'),
];

router.get('/', auth, getAssets);
router.get('/:id', auth, getAssetById);
router.post('/', auth, assetValidation, validate, createAsset);
router.put('/:id', auth, assetValidation, validate, updateAsset);
router.delete('/:id', auth, deleteAsset);

module.exports = router;
