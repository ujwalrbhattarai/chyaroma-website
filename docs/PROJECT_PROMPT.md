# PROJECT_PROMPT.md — Cafe Central: Multi-Branch Cafe Ordering & Management System

> **This is the master requirements file.** Before writing any code, an AI agent must read this file in full, then `FOLDER_STRUCTURE.md`, then `CHECKLIST.md`. Do not start coding until all three have been scanned. See "Rules for the AI Agent" at the bottom — they are not optional.

---

## 1. Project Overview

**Objective:** One centralized system serving two cafe branches. Customers order via table QR codes — no waiters. Orders route digitally to the kitchen. Billing, inventory deduction, and reporting are automatic.

**Problem it solves:** Manual/waiter-based ordering causes order errors, slow service, stock mismatches, and no unified visibility across branches.

**Target users:** Cafe owner (Super Admin), Branch Managers, Kitchen Staff, and Customers (guest access only, no account).

**Scope (v1):** QR ordering, live kitchen queue, digital billing, automatic inventory deduction, branch-isolated data, role dashboards, automatic reports.

**Out of scope (v1):** loyalty programs, delivery/aggregator integration, table reservations, multi-language storefront, native mobile apps.

**Design philosophy:**
- Simplicity over cleverness — the waiter-less flow must be foolproof for a non-technical customer.
- Branch isolation by data (`branch_id`), not by separate deployments.
- Every module ships independently, reviewed and approved before the next one starts.
- Different pages and different features live in different files — no monolithic files (see `FOLDER_STRUCTURE.md`).

---

## 2. Business Requirements

- Two branches, one owner, one centralized system.
- Customers order through QR — no waiter system.
- Kitchen receives orders digitally, in real time.
- Billing is fully digital, no manual receipts.
- Inventory updates automatically as orders are completed.
- Reports generate automatically, per branch and combined.
- System must handle peak lunch/dinner volume without lag on the kitchen display.
- Finalized bills are immutable — corrections happen via linked adjustment records, never silent edits.

---

## 3. Login Roles — only three, ever

> **Only Super Admin, Branch Manager, and Kitchen Staff authenticate.** Customers never log in — see Section 4.

### Super Admin
- Full access to all branches, all data, all settings.
- Creates/edits/deactivates branches.
- Creates Manager accounts.
- Views combined and per-branch reports.
- Can override/cancel any order or bill (audit-logged).

### Branch Manager
- Full access to their own branch only.
- Creates/manages Kitchen Staff for their branch.
- Manages menu, inventory, and settings for their branch.
- Views their branch's reports and billing.
- Cannot create other Managers or new branches.

### Kitchen Staff
- Access limited to the Kitchen module for their branch only.
- Accepts orders, updates status (Preparing, Ready, Completed).
- Cannot view billing, reports, inventory counts, or staff management.
- Cannot edit menu or prices.

---

## 4. Guest Access (Customer) — not a login role

- No account, no password, no session tied to an identity, ever.
- Access scoped entirely by the QR code's embedded branch + table identifier — the token is the only "credential" and only unlocks that table's menu and order.
- Can browse menu, place an order, request the bill.
- Cannot view other tables' orders or any staff-facing data.
- Customers never appear in the `Users` data — only the three login roles do.

---

## 5. Functional Modules

Each module below: purpose, inputs, outputs, permissions, dependencies.

### 5.1 Authentication
- Purpose: secure login for the three staff roles only.
- Inputs: username/email + password.
- Outputs: session token scoped to role and (for Manager/Kitchen) `branch_id`.
- Permissions: only Super Admin creates the first Manager accounts.
- Depends on: Staff Management, Branch Management.

### 5.2 Branch Management
- Purpose: create/configure branches as isolated data units.
- Inputs: name, address, contact, tax settings, hours.
- Outputs: `branch_id` tagging every order, bill, inventory item, report for that branch.
- Permissions: Super Admin only.
- Depends on: nothing — foundational.

### 5.3 Staff Management
- Purpose: manage who can log in and at what level.
- Inputs: name, role, assigned branch, contact, credentials.
- Outputs: active/inactive accounts, each tied to one branch (except Super Admin).
- Permissions: Super Admin creates Managers; Managers create Kitchen Staff for their own branch.
- Depends on: Authentication, Branch Management.

### 5.4 Menu Management
- Purpose: define what's sellable, per branch.
- Inputs: category, name, description, price, prep time, image, availability.
- Outputs: the live menu customers see via QR.
- Permissions: Manager (own branch), Super Admin (all branches).
- Depends on: Branch Management, Inventory (availability can depend on stock).

### 5.5 Customer Ordering
- Purpose: let a customer order without any staff involvement.
- Inputs: QR-derived table/branch id, selected items, quantities, notes.
- Outputs: order record, status `Pending`, tagged `branch_id` + table.
- Permissions: public, scoped only by QR token.
- Depends on: Menu Management, Branch Management, Order Rules.

### 5.6 Kitchen
- Purpose: live queue for accepting/preparing/completing orders.
- Inputs: incoming order events.
- Outputs: status transitions (Accepted → Preparing → Ready → Completed).
- Permissions: Kitchen Staff, Manager (own branch only).
- Depends on: Customer Ordering, Order Rules, Inventory (deduction trigger — see open decisions).

### 5.7 Billing
- Purpose: generate accurate, tax-inclusive bills.
- Inputs: order(s) linked to a table, tax rate, discount, payment method.
- Outputs: finalized immutable bill + receipt.
- Permissions: Manager/billing staff (own branch), Super Admin (view all).
- Depends on: Customer Ordering, Kitchen, Branch Management (tax settings).

### 5.8 Inventory
- Purpose: track ingredients, auto-deduct via recipes.
- Inputs: ingredient list, recipe mapping, purchase entries, suppliers.
- Outputs: live stock, low-stock alerts, automatic deductions.
- Permissions: Manager (own branch), Super Admin (all).
- Depends on: Menu Management (recipes), Kitchen (deduction trigger point).

### 5.9 Reports
- Purpose: auto-generate sales/inventory/staff reports, per branch and combined.
- Inputs: aggregated data from Billing, Inventory, Orders, Staff activity.
- Outputs: scheduled + on-demand reports, exportable.
- Permissions: Manager (own branch), Super Admin (all + combined).
- Depends on: Billing, Inventory, Staff Management, Branch Management.

### 5.10 Settings
- Purpose: global + per-branch config (tax, cancellation window, low-stock thresholds, receipt footer).
- Permissions: Super Admin (global), Manager (branch-level, if allowed — confirm).
- Depends on: Branch Management.

---

## 6. Branch System

- Multiple branches, one deployment, one database.
- Each branch has separate inventory, billing, orders, kitchen queue, reports.
- Same website, same database — isolation is logical via `branch_id`, not separate infrastructure.
- `branch_id` is attached to every branch-scoped record: staff, menu (unless shared), orders, bills, inventory, reports, settings.
- Every query touching branch-scoped data must filter by `branch_id`. Treat a missing filter as a bug, not a style choice.
- Only Super Admin can query across branches — must be a deliberate, explicit query path.

---

## 7. Customer Flow

```
Customer enters → Scans QR (branch_id + table_id) → Menu opens
→ Adds food → Places order (Pending) → Kitchen receives in real time
→ Preparing → Ready → Customer requests bill → Payment → Complete
```

Every arrow is a logged, timestamped state transition — this powers reports.

---

## 8. Order Rules

| State | Meaning | Who triggers it |
|---|---|---|
| Pending | Order placed, kitchen hasn't acted | Customer (creation) |
| Accepted | Kitchen acknowledged | Kitchen Staff — cancellation window closes here |
| Preparing | Actively cooking | Kitchen Staff — inventory deduction point (confirm in open decisions) |
| Ready | Done, awaiting pickup | Kitchen Staff — customer may request bill |
| Completed | Served and paid | Kitchen Staff or Billing — terminal state |
| Cancelled | Voided | Customer (Pending only) or Manager (any time, reason logged) |

---

## 9. Cancellation Rules

- Customer cancellation allowed only while **Pending**.
- Maximum **2-minute window** from placement, even if still Pending.
- Kitchen **Accepting** the order disables customer cancellation immediately, regardless of the timer.
- Managers can still void/cancel after acceptance as an override — must be logged (who, when, why).

---

## 10. Kitchen Workflow

```
Receive order (Pending) → Accept (cancellation closes) → Preparing (deduction point)
→ Ready (customer notified) → Completed (feeds Billing + Reports)
```

Kitchen display: orders grouped by table, sorted oldest-first, with a visible timer per order.

---

## 11. Billing

- Generate bill once order(s) reach Ready/Completed; can combine multiple orders from one table/visit.
- Tax: per branch settings, configurable, never hardcoded.
- Discount: manual or code-based; document whether applied before or after tax.
- Payment: records method + amount; confirm whether split/partial payments are in scope.
- Receipt: auto-generated on payment, itemized, includes tax/discount/total/branch info.
- Print: support thermal receipt printing plus a digital copy.
- Finalized bills are immutable — corrections are linked adjustment records only.

---

## 12. Inventory

- Ingredients: base stock units, tracked per branch.
- Recipes: menu item → ingredients + quantities consumed per unit sold.
- Automatic deduction at the agreed trigger point (pick one: Accepted or Preparing — don't mix).
- Low stock: configurable threshold → alert to Manager; optionally auto-disable dependent menu items.
- Purchases: Manager logs restocks (ingredient, quantity, cost, supplier, date).
- Suppliers: basic contact records linked to purchases.

---

## 13. Menu Management

- Categories, item name, price, description, image, prep time, availability (manual or inventory-linked).
- Per-branch pricing — confirm if branches can have different prices for the same item.

---

## 14. Staff Management

```
Super Admin → creates Branch Manager (assigned to one branch)
Manager → creates Kitchen Staff (own branch only)
Kitchen Staff → Kitchen module access only
```

- No self-registration for any role.
- Deactivation is soft-delete — preserve historical activity for reports.

---

## 15. Dashboard Design

- **Admin:** sidebar — Branches, Staff, Combined Reports, Settings, read-only into each branch's Menu/Inventory/Billing. Home: combined KPIs.
- **Manager:** sidebar — Menu, Inventory, Kitchen (view), Billing, Staff (kitchen only), Reports, Settings. Home: branch KPIs.
- **Kitchen:** sidebar — minimal, just the live queue + "completed today." Home: the queue itself.
- **Customer ordering screen (public, not a dashboard, no login):** top nav only — Menu, Cart, My Order Status, Request Bill. Mobile-first, no app install.

---

## 16. Database (described, no SQL)

Users (3 login roles only) · Branches · Tables (QR tokens) · Menu · Recipes · Inventory · Suppliers · Purchases · Orders · Order Items · Bills · Payments · Reports · Settings · Audit Log (manual overrides — who/what/when/why).

---

## 17. Pages (each its own file — see `FOLDER_STRUCTURE.md`)

Login · Admin Dashboard · Manager Dashboard · Menu Management · Staff Management · Inventory · Kitchen Queue · Billing · Reports · Settings · Customer Menu (public) · Customer Order Status (public) · Customer Bill Request (public).

---

## 18. API Endpoints (described only)

Auth (login, logout, refresh) · Branches (CRUD) · Staff (CRUD) · Menu (CRUD, availability toggle) · Orders (create, list, update status, cancel) · Kitchen (queue, status transitions) · Billing (generate, discount, payment, receipt) · Inventory (stock, purchase, low-stock) · Reports (generate/fetch) · Settings (get/update).

---

## 19. Folder Structure

See `FOLDER_STRUCTURE.md` for the full breakdown. Summary: `frontend/`, `backend/`, `database/`, `docs/` — no new top-level folders without approval. Every page and every feature gets its own file(s); no monolithic files.

---

## 20. Coding Rules

- Small, single-purpose files.
- Reusable, modular code — no duplicate logic.
- One responsibility per file/function/class.
- Backend layering: Controllers (handle requests) → Services (business logic) → Repositories (data access). Controllers never touch the database directly.
- **Different pages and different features live in different files** — see `FOLDER_STRUCTURE.md` for the exact expected breakdown.
- Every module change gets a matching update in `CHECKLIST.md`.

---

## 21. Development Order

```
Prototype → Authentication → Branch Management → Staff Management → Menu Management
→ QR (table/token generation) → Customer Ordering → Kitchen → Billing → Inventory
→ Reports → Deployment
```

---

## 22. Open Decisions (must be resolved before the relevant module starts)

- [x] Exact tech stack: React (Vite) + Tailwind CSS frontend; Node.js + Express backend; PostgreSQL database; Vercel frontend hosting; Railway or Render backend + PostgreSQL hosting.
- [x] Real-time mechanism for kitchen/order updates: Socket.io over WebSockets.
- [x] QR generation: `qrcode` npm package.
- [x] Password reset: out of scope for v1. Once Staff Management exists, a Manager or Super Admin will manually recreate credentials; consider a reset flow for v2.
- [ ] Inventory deduction trigger: Accepted or Preparing?
- [ ] Are split/partial payments in scope for v1?
- [ ] Can branches price the same item differently?
- [ ] Are reports pre-generated snapshots or computed live?

An AI agent must **stop and ask** rather than silently deciding any of the above.

---

## 23. Rules for the AI Agent

1. **Before starting any coding task, scan this file (`PROJECT_PROMPT.md`) and `FOLDER_STRUCTURE.md` in full.** Then check `CHECKLIST.md` to confirm what's next.
2. Never redesign the architecture (Controllers → Services → Repositories; the four top-level folders).
3. Never create new top-level folders without explicit approval recorded in `CHECKLIST.md`.
4. Never combine modules — build, finish, and get approval on one module at a time, in the order in Section 21.
5. Never continue to the next module after finishing one. Stop at "awaiting approval" and wait.
6. Always update `CHECKLIST.md` when a module's status changes.
7. **Every page and every feature gets its own file(s)** — never merge multiple pages or unrelated features into one file, even if it seems convenient. See `FOLDER_STRUCTURE.md` for the exact file-per-page/feature expectation.
8. `branch_id` must filter every query on branch-scoped data. No exceptions.
9. Finalized bills are immutable. Corrections are new linked records.
10. Only three roles ever log in (Super Admin, Branch Manager, Kitchen Staff). Customers never get an account — if a task seems to need customer login, stop and flag it as a scope change.
11. If an item in Section 22 ("Open Decisions") blocks progress, stop and ask — don't assume.
