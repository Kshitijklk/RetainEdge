const router = require('express').Router();
const { z } = require('zod');
const c = require('../controllers/predictionController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);
router.post('/run', validate(z.object({ datasetId: z.string().min(1) })), c.startRun);
router.get('/runs', c.listRuns); // prediction history
router.get('/runs/:runId', c.getRun); // status + summary
router.get('/runs/:runId/customers', c.listCustomers); // ?risk=High&search=&page=&limit=&sort=asc|desc
router.get('/runs/:runId/customers/:customerId', c.getCustomer); // probability + factors + recommendations
router.get('/runs/:runId/export', c.exportCsv);
router.delete('/runs/:runId', c.removeRun);

module.exports = router;
