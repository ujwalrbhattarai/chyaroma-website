# FOLDER_STRUCTURE.md — Files & Folders

> An AI agent must scan this file (alongside `PROJECT_PROMPT.md`) before starting any coding task. The core rule: **every page gets its own file, every feature/module gets its own set of files.** Never merge unrelated pages or features into one file for convenience — even a "quick" combined file creates a cleanup debt later and breaks the module-by-module review process in `CHECKLIST.md`.

Placeholders like `[stack-specific ext]` should be replaced with the real extension once the tech stack is locked (e.g. `.jsx`, `.vue`, `.ts`) — don't hardcode a framework here since that's still an open decision (see `PROJECT_PROMPT.md` Section 22).

```
project-root/
│
├── frontend/
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.[ext]
│   │   ├── admin/
│   │   │   ├── AdminDashboardPage.[ext]
│   │   │   └── BranchManagementPage.[ext]
│   │   ├── manager/
│   │   │   ├── ManagerDashboardPage.[ext]
│   │   │   ├── MenuManagementPage.[ext]
│   │   │   ├── StaffManagementPage.[ext]
│   │   │   ├── InventoryPage.[ext]
│   │   │   ├── BillingPage.[ext]
│   │   │   └── SettingsPage.[ext]
│   │   ├── kitchen/
│   │   │   └── KitchenQueuePage.[ext]
│   │   └── customer/
│   │       ├── CustomerMenuPage.[ext]
│   │       ├── CustomerOrderStatusPage.[ext]
│   │       └── CustomerBillRequestPage.[ext]
│   │
│   ├── components/
│   │   ├── menu/
│   │   │   ├── MenuItemCard.[ext]
│   │   │   ├── MenuCategoryList.[ext]
│   │   │   └── AvailabilityToggle.[ext]
│   │   ├── orders/
│   │   │   ├── OrderCard.[ext]
│   │   │   ├── OrderStatusBadge.[ext]
│   │   │   └── OrderTimer.[ext]
│   │   ├── kitchen/
│   │   │   └── KitchenOrderColumn.[ext]
│   │   ├── billing/
│   │   │   ├── BillSummary.[ext]
│   │   │   └── ReceiptView.[ext]
│   │   ├── inventory/
│   │   │   ├── StockLevelRow.[ext]
│   │   │   └── LowStockAlert.[ext]
│   │   ├── staff/
│   │   │   └── StaffListItem.[ext]
│   │   └── shared/
│   │       ├── Sidebar.[ext]
│   │       ├── TopNav.[ext]
│   │       ├── Button.[ext]
│   │       └── Modal.[ext]
│   │
│   ├── services/            # API-calling logic, one file per module — never mixed
│   │   ├── authService.[ext]
│   │   ├── branchService.[ext]
│   │   ├── staffService.[ext]
│   │   ├── menuService.[ext]
│   │   ├── orderService.[ext]
│   │   ├── kitchenService.[ext]
│   │   ├── billingService.[ext]
│   │   ├── inventoryService.[ext]
│   │   └── settingsService.[ext]
│   │
│   ├── routes/
│   │   └── AppRoutes.[ext]     # route protection per role lives here, not scattered across pages
│   │
│   └── styles/ (if not using a utility framework)
│
├── backend/
│   ├── controllers/          # one file per module — handles requests only, no business logic
│   │   ├── authController.[ext]
│   │   ├── branchController.[ext]
│   │   ├── staffController.[ext]
│   │   ├── menuController.[ext]
│   │   ├── orderController.[ext]
│   │   ├── kitchenController.[ext]
│   │   ├── billingController.[ext]
│   │   ├── inventoryController.[ext]
│   │   ├── reportsController.[ext]
│   │   └── settingsController.[ext]
│   │
│   ├── services/             # one file per module — business logic, branch_id enforcement lives here
│   │   ├── authService.[ext]
│   │   ├── branchService.[ext]
│   │   ├── staffService.[ext]
│   │   ├── menuService.[ext]
│   │   ├── orderService.[ext]
│   │   ├── kitchenService.[ext]
│   │   ├── billingService.[ext]
│   │   ├── inventoryService.[ext]
│   │   └── settingsService.[ext]
│   │
│   ├── repositories/         # one file per entity — the only layer that talks to the database
│   │   ├── userRepository.[ext]
│   │   ├── branchRepository.[ext]
│   │   ├── tableRepository.[ext]
│   │   ├── menuRepository.[ext]
│   │   ├── recipeRepository.[ext]
│   │   ├── inventoryRepository.[ext]
│   │   ├── supplierRepository.[ext]
│   │   ├── purchaseRepository.[ext]
│   │   ├── orderRepository.[ext]
│   │   ├── billRepository.[ext]
│   │   ├── paymentRepository.[ext]
│   │   ├── settingsRepository.[ext]
│   │   └── auditLogRepository.[ext]
│   │
│   ├── middleware/
│   │   ├── authMiddleware.[ext]      # verifies session + role
│   │   └── branchScopeMiddleware.[ext] # enforces branch_id filtering
│   │
│   └── routes/                # one file per module, maps endpoints to controllers
│       ├── authRoutes.[ext]
│       ├── branchRoutes.[ext]
│       ├── staffRoutes.[ext]
│       ├── menuRoutes.[ext]
│       ├── orderRoutes.[ext]
│       ├── kitchenRoutes.[ext]
│       ├── billingRoutes.[ext]
│       ├── inventoryRoutes.[ext]
│       └── settingsRoutes.[ext]
│
├── database/
│   ├── migrations/            # one file per entity/table, timestamped
│   └── seeds/                 # sample/dev data, one file per entity
│
└── docs/
    ├── PROJECT_PROMPT.md
    ├── CHECKLIST.md
    └── FOLDER_STRUCTURE.md    # this file
```

## Rules that apply to this structure

1. **No new top-level folders** beyond `frontend/`, `backend/`, `database/`, `docs/` without explicit owner approval.
2. **One page = one file.** `AdminDashboardPage` never contains `BranchManagementPage`'s logic inline — it imports and composes, it doesn't absorb.
3. **One feature = its own service/controller/repository file**, even if it feels small right now (e.g. `settingsService.[ext]` stays separate from `branchService.[ext]` even though settings are branch-scoped).
4. **Controllers never touch the database directly** — always Controller → Service → Repository.
5. When a module in `CHECKLIST.md` is built, only the files under that module's scope should be touched. Building Kitchen shouldn't require editing `billingController.[ext]`.
6. If a new page or feature doesn't fit an existing folder, propose the addition rather than shoving it into an unrelated file.
