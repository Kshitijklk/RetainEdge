const router = require('express').Router();
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const limiter = (max) => rateLimit({ windowMs: 15 * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts, try again later' } });

router.post('/phone', limiter(20), validate(z.object({ idToken: z.string().min(20), name: z.string().max(80).optional() })), c.phoneLogin);
router.post('/google', limiter(30), validate(z.object({ idToken: z.string().min(20) })), c.googleLogin);
router.get('/me', auth, c.me);
router.post('/logout', auth, c.logout);

module.exports = router;
