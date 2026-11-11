# RetainEdge Backend (Node.js + Express + MongoDB Atlas)

## 1. Setup
```bash
npm install
cp .env.example .env     # then fill in the values
npm run dev              # http://localhost:5000/api/health
```
Needs Node 20+.

### MongoDB Atlas
Create a free cluster -> Database Access (create user) -> Network Access (allow your IP / 0.0.0.0/0 for testing) -> Connect -> Drivers -> copy the URI into `MONGODB_URI` (add `/retainedge` as db name).

### Firebase (Google login)
1. Firebase Console -> create project -> Authentication -> Sign-in method -> enable **Google**.
2. Project Settings -> Service accounts -> **Generate new private key**. Copy `project_id`, `client_email`, `private_key` into `.env`.
3. Project Settings -> General -> add a Web app; use its config in your React app.
4. Authentication -> Settings -> Authorized domains: add your frontend domain.

### OTP email
Gmail: enable 2-step verification -> create an **App Password** -> put in `SMTP_USER` / `SMTP_PASS`.
If SMTP is empty in development, the OTP is printed in the server console.

## 2. Auth flow
**Google:** React signs in with Firebase, then sends the ID token to the backend:
```js
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
const result = await signInWithPopup(getAuth(), new GoogleAuthProvider());
const idToken = await result.user.getIdToken();
const { data } = await axios.post(`${API}/api/auth/google`, { idToken });
localStorage.setItem("token", data.token);
```
**OTP:**
```js
await axios.post(`${API}/api/auth/otp/request`, { email });
const { data } = await axios.post(`${API}/api/auth/otp/verify`, { email, otp: "123456" });
localStorage.setItem("token", data.token);
```
All protected routes need `Authorization: Bearer <token>`.

## 3. API reference
| Method | Route | Description |
|---|---|---|
| GET | /api/health | Health check |
| POST | /api/auth/otp/request | `{email}` send OTP |
| POST | /api/auth/otp/verify | `{email, otp, name?}` -> `{token,user}` |
| POST | /api/auth/google | `{idToken}` -> `{token,user}` |
| GET | /api/auth/me | Current user |
| POST | /api/auth/logout | Logout (client discards token) |
| POST | /api/datasets | multipart, field `file` (.csv) - validates + profiles |
| GET | /api/datasets | List my datasets |
| GET | /api/datasets/:id | Data summary (columns, missing, preview) |
| DELETE | /api/datasets/:id | Delete dataset + its runs |
| POST | /api/predictions/run | `{datasetId}` -> 202, starts run |
| GET | /api/predictions/runs | Prediction history (`?page&limit`) |
| GET | /api/predictions/runs/:runId | Run status (`processing/completed/failed`) + summary |
| GET | /api/predictions/runs/:runId/customers | `?risk=High&search=&page=&limit=&sort=asc` |
| GET | /api/predictions/runs/:runId/customers/:customerId | Probability, SHAP factors, recommendations |
| GET | /api/predictions/runs/:runId/export | Download results CSV |
| DELETE | /api/predictions/runs/:runId | Delete a run |
| GET | /api/dashboard/summary | KPIs, risk distribution, histogram, top drivers, recommendation summary, top high-risk customers (`?runId` optional) |

Typical UI flow: upload -> `POST /predictions/run` -> poll `GET /runs/:id` every 2s until `completed` -> show dashboard.

## 4. Plugging in your friend's model
Set `ML_MODE=mock` (default) to test everything with fake predictions.

When the model is ready, your friend wraps it in a small Python service (FastAPI/Flask) exposing:

`POST /predict` (multipart, field `file` = the CSV) returning:
```json
{
  "model_version": "xgb-v1",
  "results": [
    { "customer_id": "7590-VHVEG",
      "churn_probability": 0.81,
      "top_factors": [ {"feature": "Contract", "impact": 0.32, "value": "Month-to-month"} ] }
  ]
}
```
`impact` = SHAP value (positive pushes towards churn). Then set `ML_MODE=http` and `ML_SERVICE_URL=...`.
Risk level (High >= 0.7, Medium >= 0.4) and the rule-based recommendations are computed by this backend
(`services/riskService.js`, `services/recommendationService.js`).

## 5. MongoDB collections
users, otps (auto-expire), datasets, predictionruns (history), predictions (per-customer results, factors, recommendations).
