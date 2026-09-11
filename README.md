# Cafe Central

Multi-branch cafe ordering and management system.

## Approved technical stack

- Frontend: React, built with Vite and styled with Tailwind CSS
- Backend: Node.js with Express
- Database: PostgreSQL
- Real-time updates: Socket.io over WebSockets
- QR generation: `qrcode` npm package
- Hosting: Vercel for the frontend; Railway or Render for the backend and PostgreSQL

## Current status

The Prototype is approved and Authentication is awaiting approval. Authentication provides staff-only JWT sessions; branch management, staff management, QR ordering, and other business modules have not yet been implemented.

## Backend setup

Set `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and `FRONTEND_ORIGIN` (defaults to `http://localhost:5173`). On startup, the backend creates the initial Super Admin only when that email does not already exist; it never logs or rotates the password.

## Deferred decisions

- Inventory deduction trigger: Accepted or Preparing
- Split or partial payments in v1
- Per-branch pricing for the same item
- Reports as pre-generated snapshots or live computation
- Password reset is out of scope for v1. Once Staff Management exists, a Manager or Super Admin will manually recreate credentials; consider a reset flow for v2.
