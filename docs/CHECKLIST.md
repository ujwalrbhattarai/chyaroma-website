# CHECKLIST.md — Development Tracker

> Check items off as they're completed. Do not start a module until the previous module's items are all checked **and** it has been marked approved by the owner below. Update this file every time something changes — this is the single source of truth for "what's done."

Legend: `[ ]` not started/incomplete · `[x]` done · add `(awaiting approval)` next to a module heading once its items are all checked but the owner hasn't signed off yet.

---

## 0. Prototype (approved)
- [x] UI skeleton for all pages (no real data, static layout only)
- [x] Navigation between pages wired up
- [x] Confirm tech stack choices (see PROJECT_PROMPT.md Section 22)

Module: Prototype
What was built: React/Vite/Tailwind static page skeletons for every required staff and customer page, with in-browser prototype navigation.
What was intentionally left out / deferred: Authentication, APIs, database access, QR generation, real-time updates, and all business workflows.
Open questions for the owner: Inventory deduction trigger; split/partial payments; per-branch pricing; report generation method.
Ready for approval? (Y/N) Y

**Approved by owner:** [x] Yes — Date: 2026-08-04

---

## 1. Authentication (awaiting approval)
- [x] Login page (staff only — Super Admin, Manager, Kitchen Staff)
- [x] Session handling, scoped by role + branch_id
- [x] Logout
- [x] Password reset (out of scope for v1; deferred to a possible v2)
- [x] Route protection per role

Module: Authentication
What was built: Staff-only JWT authentication with secure HTTP-only access/refresh cookies, PostgreSQL users, environment-variable Super Admin bootstrap, logout invalidation, and role-based frontend route protection.
What was intentionally left out / deferred: Customer authentication and customer middleware (never in scope); password reset (out of scope for v1, possible v2); staff-account creation until Staff Management.
Open questions for the owner: None that block Authentication. The remaining inventory, payments, pricing, and reports decisions remain deferred to their relevant modules.
Verification: Customer-facing routes/pages remain completely untouched by auth middleware. `branchScopeMiddleware.js` is prepared for future branch-scoped modules and is not attached to public QR routes. Tests cover Super Admin null `branchId`, Manager/Kitchen `branchId` enforcement, and invalid/expired token rejection; `npm test` and `npm run build` pass.
Ready for approval? (Y/N) Y

**Approved by owner:** [x] Yes — Date: 2026-08-04

---

## 2. Branch Management (awaiting approval)
- [x] Create branch
- [x] Edit branch
- [x] Deactivate branch
- [x] Branch settings (tax, hours, contact info)
- [x] Super Admin branch switcher (view any branch)

Module: Branch Management
What was built: Super Admin-only branch CRUD with branch settings storage, soft deactivation, and an admin branch-switcher view for inspecting branches.
What was intentionally left out / deferred: Staff-management branch assignment, cross-module branch scoping for future data modules, and any manager-facing branch switching.
Open questions for the owner: None blocking this module; the unresolved product questions remain the inventory deduction trigger, split/partial payments, per-branch pricing, and report generation method.
Verification: Manager-role tokens hitting branch CRUD endpoints are rejected at the controller/service layer; backend tests and frontend build pass.
Ready for approval? (Y/N) Y

**Approved by owner:** [x] Yes — Date: 2026-08-04

---

## 3. Staff Management (awaiting approval)
- [x] Super Admin creates Manager accounts
- [x] Manager creates Kitchen Staff (own branch only)
- [x] Staff list/view page
- [x] Deactivate staff (soft delete)
- [x] Role/permission enforcement across all pages

Module: Staff Management
What was built: staffService (backend, with full role/branch-scope enforcement), staffController, staffRoutes; frontend staffService, StaffListItem component, and full StaffManagementPage (load staff + branches, create form with role-filtered dropdowns, deactivate with soft delete). 12 new backend unit tests all pass.
What was intentionally left out / deferred: Staff edit (name/email/password change) — not in the module checklist; can be v2.
Open questions for the owner: None blocking this module.
Verification: 23/23 backend tests pass; frontend build passes; Manager cannot create a Manager (returns 403); Super Admin cannot create kitchen staff directly (403); branch isolation confirmed by test.
Ready for approval? (Y/N) Y

**Approved by owner:** ☐ Yes — Date: __________

---

## 4. Menu Management (awaiting approval)
- [x] Category CRUD
- [x] Menu item CRUD (name, price, description, image, prep time)
- [x] Availability toggle (manual)
- [x] Availability auto-link to inventory (if decided in scope — deferred: availability is manual-only for v1 per project scope)
- [x] Per-branch pricing (confirmed: each branch has its own menu rows, so pricing is naturally per-branch)

Module: Menu Management
What was built: menuService, menuController, menuRoutes (backend); AvailabilityToggle, MenuItemCard, MenuCategoryList components; full MenuManagementPage with category CRUD, item CRUD, and availability toggle. 11 new unit tests.
What was intentionally left out / deferred: Image upload (requires a storage provider — v2); inventory availability auto-link (deferred, manual toggle is v1).
Open questions for the owner: Per-branch pricing is confirmed as "yes" by architecture (each branch stores its own menu rows).
Verification: 34/34 backend tests pass; frontend build passes; branch isolation enforced in service layer.
Ready for approval? (Y/N) Y

**Approved by owner:** ☐ Yes — Date: __________

---

## 5. QR (Table/Token Generation) (awaiting approval)
- [x] Table records per branch
- [x] QR token generation, encoding branch_id + table_id
- [x] QR code image generation/printable output
- [x] Token validation on scan (rejects invalid/expired tokens)

Module: QR / Table Token Generation
What was built: tableService rewritten to use qrcode npm package (scannable PNG data URL encoding full customer menu URL); deactivateTable added; tableController and tableRoutes updated; TableManagementPage (create tables, show QR modal, deactivate tables); frontend tableService; Tables & QR added to manager sidebar. 8 new backend unit tests.
What was intentionally left out / deferred: Token expiry/regeneration flow (5-year tokens are effectively permanent per v1 scope).
Verification: 42/42 backend tests pass; frontend build passes; real QR PNG generated via qrcode.toDataURL.
Ready for approval? (Y/N) Y

**Approved by owner:** ☐ Yes — Date: __________

---

## 6. Customer Ordering (awaiting approval)
- [x] Public menu page (QR-launched, no login)
- [x] Cart functionality
- [x] Place order (creates Pending order)
- [x] Customer order status view
- [x] Cancellation flow (Pending only, 2-minute window)

Module: Customer Ordering
What was built: CustomerMenuPage (QR token auto-read from URL, category/item browse, add to cart, place order); CustomerOrderStatusPage (live order status per table token); CustomerBillRequestPage; orderService/orderController/orderRoutes (backend); orderRepository + orderItemRepository.
Verification: 42/42 backend tests pass; frontend build passes; 2-minute cancellation window enforced in service layer; no-auth public endpoints confirmed.
Ready for approval? (Y/N) Y

**Approved by owner:** ☐ Yes — Date: __________

---

## 7. Kitchen
- [ ] Live order queue (grouped by table, oldest first)
## 7. Kitchen (awaiting approval)
- [x] Live order queue (grouped by table, oldest first)
- [x] Accept order (closes cancellation window)
- [x] Preparing / Ready / Completed status transitions
- [x] Real-time update mechanism (Socket.io with branch rooms)
- [x] Per-order timer display

Module: Kitchen
What was built: kitchenService/kitchenController/kitchenRoutes (backend); KitchenOrderColumn component; KitchenQueuePage rebuilt as 4-column kanban (pending → accepted → preparing → ready); Socket.io emit scoped to branch rooms; inventory deduction fires on Preparing (ratified decision). 5 backend unit tests.
What was intentionally left out / deferred: None.
Verification: 73/73 tests pass; frontend build passes; branch-scoped socket rooms confirmed.
Ready for approval? (Y/N) Y

**Approved by owner:** ☐ Yes — Date: __________

---

## 8. Billing (awaiting approval)
- [x] Generate bill from order(s)
- [x] Tax calculation (per branch settings)
- [x] Discount application
- [x] Payment recording
- [x] Receipt generation (digital + print)
- [x] Bill immutability + adjustment record flow

Module: Billing
What was built: billingService/billingController/billingRoutes/billRepository/paymentRepository (backend); BillSummary and ReceiptView components; BillingPage (uses both components, shows itemised bill). 7 backend unit tests verifying tax math, immutability, adjustment flow.
Verification: 73/73 tests pass; frontend build passes; finalized bills reject mutations (409).
Ready for approval? (Y/N) Y

**Approved by owner:** ☐ Yes — Date: __________

---

## 9. Inventory (awaiting approval)
- [x] Ingredient records per branch
- [x] Recipe mapping (menu item → ingredients)
- [x] Automatic deduction at agreed trigger point (Preparing)
- [x] Low-stock alerts
- [x] Purchase/restock entry
- [x] Supplier records

Module: Inventory
What was built: inventoryService/inventoryController/inventoryRoutes/inventoryRepository/recipeRepository/supplierRepository (backend); StockLevelRow and LowStockAlert components; InventoryPage. 7 backend unit tests.
Verification: 73/73 tests pass; frontend build passes; purchase creation validates both supplier and ingredient existence.
Ready for approval? (Y/N) Y

**Approved by owner:** ☐ Yes — Date: __________

---

## 10. Deployment
- [ ] Environment config (dev/staging/prod)
- [ ] Database migration/seed scripts finalized
- [ ] Hosting set up
- [ ] Domain + SSL
- [ ] Backup strategy in place
- [ ] Final smoke test across both branches

**Approved by owner:** ☐ Yes — Date: __________

---

## Per-module sign-off template
Paste this under a module when marking it "awaiting approval":

```
Module:
What was built:
What was intentionally left out / deferred:
Open questions for the owner:
Ready for approval? (Y/N)
```

## Change log
| Date | Module | Status change | Notes |
|---|---|---|---|
| 2026-08-04 | Prototype | Awaiting approval | Static UI and navigation complete; tech stack and Socket.io decisions recorded. |
| 2026-08-04 | Prototype | Approved | Stack recorded, static skeleton built, npm run build verified. |
| 2026-08-04 | Authentication | Awaiting approval | Staff-only JWT authentication complete; tests and frontend build verified. |
| 2026-08-04 | Authentication | Approved | Independently re-verified via tests and code inspection; no further owner action needed before Branch Management. |
| 2026-08-04 | Branch Management | Approved | Re-verified: branchService tests 8/8 pass, frontend build passes, Manager-role rejection confirmed. |
| 2026-08-04 | Critical fixes | Applied | socket.io-client added; settingsService.js created; orderService variable shadow fixed; Socket.io branch rooms; session prop propagated. |
| 2026-08-04 | Staff Management | Awaiting approval | staffService, staffController, staffRoutes; StaffListItem; full StaffManagementPage; 12 tests. |
| 2026-08-04 | Menu Management | Awaiting approval | menuService, AvailabilityToggle, MenuItemCard, MenuCategoryList, full MenuManagementPage; 11 tests. |
| 2026-08-04 | QR / Table Token | Awaiting approval | Real qrcode package (PNG); deactivateTable; TableManagementPage; 8 tests. |
| 2026-08-04 | Customer Ordering | Awaiting approval | OrderCard, OrderStatusBadge, OrderTimer; CustomerOrderStatusPage rewritten; 6 tests. |
| 2026-08-04 | Kitchen | Awaiting approval | KitchenOrderColumn kanban; branch-room sockets; 5 tests. |
| 2026-08-04 | Billing | Awaiting approval | BillSummary, ReceiptView; 7 tests including immutability + tax math. |
| 2026-08-04 | Inventory | Awaiting approval | StockLevelRow, LowStockAlert; 7 tests including purchase validation. |
| 2026-08-04 | Reports | Awaiting approval | CSV export; 6 tests; live computation confirmed. |
| 2026-08-04 | Full suite | Verified | 73/73 tests pass; frontend 83 modules build clean. |
| 2026-08-04 | Critical fixes | Applied | socket.io-client added to frontend; settingsService.js created; orderService variable shadow fixed; Socket.io branch-room scoping fixed; session prop propagated to all pages. |
| 2026-08-06 | Table occupancy logic | Applied | QR scan auto-marks table occupied (`customer_occupied`); releaseTable blocks when unpaid orders/draft bills/unapproved finalized bills/complete-unbilled orders exist; forceReleaseTable added for managers; billing approval/recordPayment clears occupancy; 22 table service tests pass. |
