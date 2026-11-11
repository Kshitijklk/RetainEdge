require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');

(async () => {
  await connectDB();
  app.listen(env.PORT, () =>
    console.log(`RetainEdge API running on port ${env.PORT} [${env.NODE_ENV}] ML_MODE=${env.ML_MODE}`)
  );
})();
