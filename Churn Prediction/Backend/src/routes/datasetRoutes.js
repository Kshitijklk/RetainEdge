const router = require('express').Router();
const c = require('../controllers/datasetController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(auth);
router.post('/', upload, c.upload);
router.get('/', c.list);
router.get('/:id', c.get);
router.delete('/:id', c.remove);

module.exports = router;
