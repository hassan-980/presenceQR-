# Add an Express + MongoDB backend (MERN) alongside the working app

Express cannot run inside this app's runtime (edge/Workers — no Node process, and the MongoDB driver needs raw TCP sockets). So the plan delivers a real, complete Express + Mongoose backend as a separate server folder in this project that you can run locally or deploy anywhere Node runs, while the live preview keeps working exactly as it does today.

## What you get

A `server/` folder containing a full MERN-style API for PresenceQR:

- Express app with CORS, JSON parsing, error handling
- MongoDB connection via Mongoose (`MONGO_URI` from `.env`)
- JWT auth (register, login, `protect` + `requireRole` middleware, bcrypt password hashing)
- All current features ported: classes, QR sessions, geofenced attendance marking, reports

## Data model (Mongoose)

```text
User      { name, email, passwordHash, role: student|teacher|admin, rollNo }
Class     { name, code, teacher -> User }
Enrollment{ class -> Class, student -> User }
Session   { class, teacher, token, latitude, longitude, radiusM, startedAt, expiresAt }
Record    { session, class, student, markedAt, latitude, longitude, distanceM }
```

## API endpoints

```text
POST   /api/auth/register            create account (role chosen at signup)
POST   /api/auth/login               returns JWT
GET    /api/auth/me                  current user + role

GET    /api/classes                  teacher's classes / student's enrolled classes
POST   /api/classes                  teacher creates a class
DELETE /api/classes/:id              teacher/admin deletes class (cascades sessions/records)

POST   /api/sessions                 teacher starts session (lat/lng/radius/duration) -> token
GET    /api/sessions/class/:classId  session list for a class
DELETE /api/sessions/:id             teacher deletes a session + its records

POST   /api/attendance/mark          { token, latitude, longitude } — validates expiry,
                                     Haversine distance vs radius, auto-enrolls, records
DELETE /api/attendance/:id           teacher removes a record (proxy correction)
GET    /api/attendance/me            student's own attendance summary

GET    /api/reports/class/:classId   per-student totals, session dates, last attended
GET    /api/reports/class/:classId/csv  CSV download

GET    /api/admin/users              admin: list users
PATCH  /api/admin/users/:id/role     admin: change role
```

Geofence logic (Haversine + expiry check) is ported verbatim from the current server logic, so proxy prevention behaves identically.

## Frontend

The React app is left untouched and keeps using the current backend, so nothing breaks in the preview. The `server/` folder ships with a README covering:

- `npm install && npm run dev` to run the API on `http://localhost:5000`
- required env vars (`MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_ORIGIN`)
- how to point a React client at it (`VITE_API_URL` + a small `api.ts` fetch wrapper, included as a reference file)

If you later want the live app switched over to this API, that's a follow-up step once the Express server is deployed and reachable — I'd swap the data hooks to call `VITE_API_URL` then.

## Technical notes

- Stack: express 4, mongoose 8, jsonwebtoken, bcryptjs, cors, dotenv
- Folder layout: `server/src/{models,routes,controllers,middleware,utils}`, `server/src/index.js`
- No changes to existing app files, database, or routes
