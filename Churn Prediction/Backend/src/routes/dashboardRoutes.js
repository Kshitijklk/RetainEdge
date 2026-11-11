const router = require('express').Router();
const c = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.get('/summary', auth, c.summary);
module.exports = router;
