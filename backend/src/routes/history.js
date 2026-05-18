const express = require('express');
const router = express.Router();
const { getAssetHistory, getEmployeeHistory, getAllHistory } = require('../controllers/historyController');
const auth = require('../middleware/auth');

router.get('/', auth, getAllHistory);
router.get('/assets/:id', auth, getAssetHistory);
router.get('/employees/:id', auth, getEmployeeHistory);

module.exports = router;
