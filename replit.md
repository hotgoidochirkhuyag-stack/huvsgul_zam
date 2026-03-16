# Хөвсгөл Зам ХК — Corporate Website & ERP System

## Overview

This is a full-stack web application for **Khuvsgul Zam LLC** (Хөвсгөл Зам ХК), a Mongolian road and bridge construction company. The app serves two main purposes:

1. **Public corporate website** — showcases the company's projects, services, videos, statistics, and provides contact/pricing request forms.
2. **Internal ERP (Enterprise Resource Planning) system** — role-based dashboards for management, project tracking, employee KPI calculation, daily reporting, and plant/factory management.

The application is written in **Mongolian (mn)** language throughout the UI.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend Architecture

- **Framework**: React (with TypeScript, Vite bundler)
- **Routing**: `wouter` — lightweight client-side SPA routing
- **State & Data Fetching**: TanStack React Query (server state management, caching)
- **UI Components**: shadcn/ui (built on Radix UI primitives) with the "new-york" style
- **Styling**: Tailwind CSS with a custom navy blue (`#0f172a`) and gold (`#d97706`) theme; CSS variables for all colors; Montserrat (headings) + Inter (body) fonts
- **Animations**: Framer Motion for page transitions and scroll animations
- **Forms**: React Hook Form + Zod validation (via `@hookform/resolvers`)
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

**Key pages and routing:**
- `/` — Public Home page (Navbar, Hero, Stats, Projects, Videos, Services, Pricelist, Contact, Footer)
- `/admin` — Login page (role-based: ADMIN, BOARD, PROJECT, ENGINEER)
- `/select-role` — Role selection page (also entry for ERP worker reports)
- `/dashboard/board`, `/dashboard/project`, `/dashboard/admin`, `/dashboard/engineer` — Protected dashboards (ProtectedRoute checks localStorage token + role)
- `/erp` — ERP dashboard (management view)
- `/erp/report` — Worker daily report form (query param `?dept=office|field|plant`)

**Auth approach**: Token-based via `localStorage`. After login, `adminToken = "authenticated"` and `userRole` are stored. The `ProtectedRoute` component checks these before rendering dashboard pages. This is a simple client-side guard (not a cryptographic session).

### Backend Architecture

- **Runtime**: Node.js (ESM, TypeScript via `tsx`)
- **Framework**: Express.js
- **Dev server**: Vite middleware mode integrated into Express for HMR in development
- **Production**: Express serves static files from `dist/public/`
- **Build**: Custom `script/build.ts` uses Vite (client) + esbuild (server) with a curated allowlist of server deps to bundle

**Key server files:**
- `server/index.ts` — App entry, starts Express, conditionally loads Vite middleware
- `server/routes.ts` — All API route registrations
- `server/db.ts` — PostgreSQL connection pool via `drizzle-orm/node-postgres`
- `server/storage.ts` — Cloudinary media queries (projects, stats, videos)
- `server/kpiEngine.ts` — KPI calculation logic (norm vs. actual performance, bonus computation)
- `server/normAgent.ts` — Scrapes legal norms from `legalinfo.mn` to update KPI configs

**API structure:**
- `/api/admin/login` — Role-based login (hardcoded user/password map, returns static token)
- `/api/projects`, `/api/stats`, `/api/videos` — Cloudinary media via storage layer
- `/api/subscriptions`, `/api/contacts` — DB CRUD (protected with `x-admin-token` header)
- `/api/erp/*` — ERP endpoints: employees, projects, plants, KPI team, daily reports, norm sync
- `/api/sheet-data` — Google Sheets proxy for live stats data

**Authentication middleware**: `requireAdmin` checks `req.headers["x-admin-token"] === "authenticated"` — simple header check, not JWT.

### Data Storage

- **Database**: PostgreSQL via Drizzle ORM (`drizzle-orm/node-postgres`)
- **Schema location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit (`drizzle-kit push` for schema sync)
- **Connection**: Pool with SSL (`rejectUnauthorized: false`) for hosted Postgres (Render-compatible)

**Database tables:**
- `projects` — Construction project records
- `contacts` — Contact form submissions
- `content` — CMS-style editable page sections (hero, about, etc.)
- `success_gallery` — Gallery images
- `subscriptions` — Email subscribers (job/news categories)
- ERP tables: `employees`, `kpiConfigs`, `dailyReports`, `erpProjects`, `plants`, etc. (defined in `shared/schema.ts`)

**Media storage**: Cloudinary is used for all images and videos (not stored in DB). The server queries Cloudinary folders (`road/`, `bridge/`, `construction/`, `stats/`, videos) via the Cloudinary Node SDK.

### Shared Code

- `shared/schema.ts` — Drizzle table definitions + Zod insert schemas (used by both client forms and server validation)
- `shared/routes.ts` — Typed API route definitions (method, path, input/output schemas) for type-safe fetch calls

### ERP Subsystem

- **KPI Engine** (`server/kpiEngine.ts`): Compares worker daily output against configured norms (БНбД standard); calculates achievement percentage and bonus pay
- **Norm Agent** (`server/normAgent.ts`): Fetches regulatory norm data from `legalinfo.mn` HTML scraping to keep KPI configs up to date
- **Video Calls** (`client/src/components/FactoryControl.tsx`): Embeds Jitsi Meet for real-time video communication between engineers and workers

---

## External Dependencies

| Service / Library | Purpose |
|---|---|
| **PostgreSQL** | Primary relational database (via `DATABASE_URL` env var) |
| **Cloudinary** | Media storage and delivery for project images and videos (env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) |
| **EmailJS** (`@emailjs/browser`) | Client-side email sending for contact forms and price request forms (service ID: `service_zo80ffc`, template: `template_1qp8wlm`, public key: `jMUTsjEJc7DCIHEK4`) — credentials are hardcoded in component files |
| **Jitsi Meet** | Embedded video calling via `meet.jit.si` external API script (loaded dynamically) |
| **Google Sheets** | Live stats data fetched via `/api/sheet-data` proxy endpoint |
| **legalinfo.mn** | Mongolian legal database scraped by `normAgent.ts` for construction work norms |
| **Google Fonts** | Inter and Montserrat fonts loaded via CDN in `index.html` |
| **Vercel** | Deployment target (configured via `vercel.json` rewrites for API and static assets) |
| **Render** | Also a deployment target (SSL config in `server/db.ts` is Render-specific) |

**Key npm packages:**
- `drizzle-orm` + `drizzle-kit` — ORM and migrations
- `drizzle-zod` — Auto-generate Zod schemas from Drizzle tables
- `@tanstack/react-query` — Server state/caching
- `framer-motion` — Animations
- `wouter` — Routing
- `cloudinary` — Server-side Cloudinary SDK
- `radix-ui/*` — Accessible UI primitives (full suite)
- `lucide-react` — Icon set
- `date-fns` — Date utilities
- `zod` — Runtime schema validation

**Environment variables required:**
```
DATABASE_URL=        # PostgreSQL connection string
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_PASSWORD=      # Referenced in server startup logs (optional override)
PORT=                # Defaults to 5000
```