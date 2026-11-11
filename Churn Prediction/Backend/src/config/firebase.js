const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let firebaseApp = null;

function getFirebaseAdmin() {
  if (firebaseApp) {
    return {
      auth: () => getAuth(firebaseApp),
    };
  }

  const serviceAccountPath = path.join(
    __dirname,
    '../../firebase-service-account.json'
  );

  const serviceAccount = require(serviceAccountPath);

  firebaseApp = initializeApp({
    credential: cert(serviceAccount),
  });

  return {
    auth: () => getAuth(firebaseApp),
  };
}

module.exports = { getFirebaseAdmin };