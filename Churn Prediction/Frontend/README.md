# RetainEdge Frontend

A React + Vite frontend for the RetainEdge churn-prediction API: upload a customer CSV, run the
model, and work through the results — dashboard, per-run customer lists, and per-customer
SHAP-style factors and recommendations.

## 1. Setup

```bash
npm install
cp .env.example .env      # point VITE_API_URL at your backend
npm run dev               # http://localhost:5173
```

Needs Node 18+, and the RetainEdge backend running (see its own README). By default the app talks
to `http://localhost:5000/api`.

### Google sign-in (optional)

The backend's OTP (email code) login works with no extra setup. If you also want the "Continue
with Google" button, fill in the four `VITE_FIREBASE_*` values in `.env` from the same Firebase
web app you configured on the backend (Firebase Console → Project Settings → General → Your
apps). Leave them blank and the button simply doesn't render.

## 2. What's here

| Route | Page | Backend calls |
|---|---|---|
| `/login` | Email-code + optional Google sign-in | `POST /auth/otp/request`, `/otp/verify`, `/auth/google` |
| `/dashboard` | KPIs, risk distribution, probability histogram, top drivers, recommendations, top high-risk customers | `GET /dashboard/summary` |
| `/datasets` | Upload a CSV (drag-and-drop), list/delete datasets | `POST /datasets`, `GET /datasets`, `DELETE /datasets/:id` |
| `/datasets/:id` | Column profiling, row preview, start a prediction run | `GET /datasets/:id`, `POST /predictions/run` |
| `/predictions` | Run history with live status for runs still processing | `GET /predictions/runs`, `DELETE /predictions/runs/:id` |
| `/predictions/:runId` | Run summary, filterable/searchable/sortable customer table, CSV export | `GET /predictions/runs/:id`, `GET /predictions/runs/:id/customers`, `GET /predictions/runs/:id/export` |
| `/predictions/:runId/customers/:customerId` | Probability, factor breakdown, recommendations | `GET /predictions/runs/:id/customers/:customerId` |
| `/profile` | Account info, sign-in methods, API health check, sign out | `GET /auth/me`, `GET /health` |

A run started from a dataset redirects straight to its run page, which polls every 2 seconds while
`status` is `processing` and stops automatically once it's `completed` or `failed` — matching the
backend's async prediction flow.

## 3. Structure

```
src/
  lib/api.js         axios instance + one function per backend endpoint
  lib/firebase.js     optional Firebase Google sign-in
  lib/format.js       number/date/risk-color formatting helpers
  context/            auth state (JWT in localStorage) + toast notifications
  components/         shared UI: layout, tables' building blocks, icons, dialogs
  pages/              one file per route above
```

## 4. Notes

- The JWT is kept in `localStorage`; a 401 from any request logs the user out automatically.
- CSV export is fetched with the auth header attached and saved via a Blob, since a plain
  `<a href>` can't carry an `Authorization` header.
- Styling uses Tailwind with a small custom token set (see `tailwind.config.js` and
  `src/index.css`) rather than a component library, to match the flat, data-forward look of the
  rest of the app.
