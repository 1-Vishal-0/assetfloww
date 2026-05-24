const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { reportDamage, getDamageReports, deleteDamageReport, resolveDamageReport } = require('../controllers/damageController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

router.get('/', auth, getDamageReports);

router.post('/',
  auth,
  upload.single('photo'),
  [
    body('asset_id').isInt({ min: 1 }).withMessage('Valid asset ID is required'),
    body('description').trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Severity must be low, medium, high, or critical'),
  ],
  validate,
  reportDamage
);

router.put('/:id/resolve', auth, resolveDamageReport);
router.delete('/:id', auth, deleteDamageReport);

module.exports = router;
