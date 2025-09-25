# Copilot Instructions for Lotto API Project

## Project Overview
This is a Node.js Express backend for a lottery management system. It interacts with a MySQL database to handle user registration, authentication, lottery ticket management, prize drawing, and admin operations.

## Key Files & Structure
- `index.js`: Main Express server, all routes and business logic are here.
- No test or build scripts detected; run with `node index.js`.
- Database connection and queries are handled directly in `index.js` using `mysql2`.

## Major Components & Data Flow
- **User Management**: Registration, login, JWT-based authentication, wallet management.
- **Lottery Operations**: Ticket generation, purchase, status updates, prize drawing, and result checking.
- **Admin Operations**: Batch lotto generation, database reset, and protected endpoints (role-based access).
- **Database**: Tables include `users`, `lotto_numbers`, `purchases`, `winning_numbers`.

## Patterns & Conventions
- All API endpoints are defined in `index.js`.
- Use `queryDatabase` (returns `{error, data}`) for most queries; use `db.promise().query` for promise-based queries.
- JWT tokens are used for authentication; access tokens in `Authorization` header, refresh tokens in body.
- Error responses use `{status: "error", message: ...}`; success responses use `{status: "success", ...}`.
- Admin-only endpoints check `req.user.role === "admin"`.
- Date handling: `draw_date` is passed as a string (e.g., `"2025-09-20"`).
- Lottery numbers are 6-digit strings; generated randomly for new batches.

## Developer Workflows
- **Start server**: `node index.js` (no build step).
- **Database**: MySQL, credentials are hardcoded in `index.js`.
- **Debugging**: Use `console.log` for tracing; errors are logged and returned in API responses.
- **Testing**: No automated tests detected; manual API testing recommended.

## Integration Points
- **External**: MySQL database, JWT for authentication, bcrypt for password hashing.
- **Frontend**: Not present in this repo; API designed for consumption by a client (e.g., Flutter app).

## Examples
- To check a prize: `POST /lotto/checkprize` with `{number, drawdate, username}`.
- To generate lotto batch (admin): `POST /admin/generate-lotto-batch` with `{count}` and admin JWT.
- To reset database (admin): `POST /reset` with admin JWT.

## Recommendations for AI Agents
- Always validate required fields in API requests.
- Use the provided query helpers (`queryDatabase`, `db.promise().query`) for DB access.
- Follow the error/success response format for consistency.
- For new features, add endpoints to `index.js` and follow existing patterns.

---
If any section is unclear or missing, please specify which part needs more detail or examples.