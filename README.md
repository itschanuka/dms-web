# Phase 3 — Customer Management

> **Depends on:** Phase 0 (Auth + DB), Phase 1 (Public site), Phase 2 (Inventory)
> **Color:** `#f59e0b` (Amber)

---

## What This Phase Delivers

- Full customer database with CRUD
- Real-time duplicate detection on phone number and NIC/Passport
- Blacklist system with reason tracking (Admin only)
- Interaction notes — add/delete inline on profile
- Customer profile page showing identity, contact, linked leads, linked deals, and financial summary
- Searchable customer list with type, status, and city filters
- Soft delete with active-deal guard

---

## Files Changed / Created

### Backend — `dms-api`

| File | Action | Description |
|------|--------|-------------|
| `src/services/customers.service.ts` | **NEW** | Full CRUD, duplicate check, blacklist, notes, soft delete |
| `src/routes/customers.routes.ts` | **NEW** | All 12 customer API endpoints with Zod validation |
| `src/app.ts` | **EDIT** | Register `/customers` route (one import + one `app.use` line) |

### Frontend — `dms-web`

| File | Action | Description |
|------|--------|-------------|
| `src/lib/api.customer.ts` | **NEW** | Customer types + `customerApi` object (append content to `api.ts`) |
| `src/app/admin/customers/page.tsx` | **NEW** | Customer list with search, filter, pagination |
| `src/app/admin/customers/new/page.tsx` | **NEW** | Create form with live duplicate warning |
| `src/app/admin/customers/[id]/page.tsx` | **NEW** | Full profile: identity, contact, notes, leads, deals |
| `src/app/admin/customers/[id]/edit/page.tsx` | **NEW** | Edit form with duplicate check (excludes self) |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/customers` | Any role | List with search + filters + pagination |
| `GET` | `/customers/check-duplicate` | Any role | Pre-create phone/NIC validation |
| `GET` | `/customers/:id` | Any role | Full profile with notes + leads + deals |
| `POST` | `/customers` | Any role | Create customer |
| `PUT` | `/customers/:id` | Any role | Update customer |
| `PATCH` | `/customers/:id/blacklist` | `blacklist_customer` permission | Blacklist with reason |
| `PATCH` | `/customers/:id/remove-blacklist` | Admin only | Remove blacklist |
| `DELETE` | `/customers/:id` | `delete_records` permission | Soft delete |
| `GET` | `/customers/:id/notes` | Any role | List notes |
| `POST` | `/customers/:id/notes` | Any role | Add note |
| `DELETE` | `/customers/:id/notes/:noteId` | Any role | Delete note |

---

## Step-by-Step Integration

### 1. Copy backend files

```powershell
# From your project root
Copy-Item "phase3\dms-api\src\services\customers.service.ts" "dms-api\src\services\customers.service.ts"
Copy-Item "phase3\dms-api\src\routes\customers.routes.ts"    "dms-api\src\routes\customers.routes.ts"
```

### 2. Edit `dms-api/src/app.ts`

Add these two lines (already shown in `phase3/dms-api/src/app.ts`):

```typescript
// At the top with other imports:
import customerRoutes from "./routes/customers.routes";

// In the routes section:
app.use("/customers", customerRoutes);
```

### 3. Append customer types + API to `dms-web/src/lib/api.ts`

Open `api.ts` and paste the contents of `phase3/dms-web/src/lib/api.customer.ts` at the **bottom** of the file, after the closing brace of `adminApi`. Remove the comment header at the top of the snippet.

### 4. Copy frontend pages

```powershell
# Customer list
Copy-Item "phase3\dms-web\src\app\admin\customers\page.tsx" `
          "dms-web\src\app\admin\customers\page.tsx"

# New customer
Copy-Item "phase3\dms-web\src\app\admin\customers\new\page.tsx" `
          "dms-web\src\app\admin\customers\new\page.tsx"

# Profile
Copy-Item "phase3\dms-web\src\app\admin\customers\[id]\page.tsx" `
          "dms-web\src\app\admin\customers\[id]\page.tsx"

# Edit
Copy-Item "phase3\dms-web\src\app\admin\customers\[id]\edit\page.tsx" `
          "dms-web\src\app\admin\customers\[id]\edit\page.tsx"
```

---

## Create All New Files From Scratch (PowerShell)

Run this block in the **VS Code terminal** from your project root to create the folder structure and blank files, then open them all at once:

```powershell
# ── Backend ────────────────────────────────────────────────────
New-Item -ItemType File -Force "dms-api\src\services\customers.service.ts"
New-Item -ItemType File -Force "dms-api\src\routes\customers.routes.ts"

# ── Frontend ───────────────────────────────────────────────────
New-Item -ItemType File -Force "dms-web\src\app\admin\customers\page.tsx"
New-Item -ItemType File -Force "dms-web\src\app\admin\customers\new\page.tsx"
New-Item -ItemType File -Force "dms-web\src\app\admin\customers\[id]\page.tsx"
New-Item -ItemType File -Force "dms-web\src\app\admin\customers\[id]\edit\page.tsx"

# ── Open all in VS Code ────────────────────────────────────────
code "dms-api\src\services\customers.service.ts"
code "dms-api\src\routes\customers.routes.ts"
code "dms-api\src\app.ts"
code "dms-web\src\lib\api.ts"
code "dms-web\src\app\admin\customers\page.tsx"
code "dms-web\src\app\admin\customers\new\page.tsx"
code "dms-web\src\app\admin\customers\[id]\page.tsx"
code "dms-web\src\app\admin\customers\[id]\edit\page.tsx"
```

---

## Verify After Deploy

Open your browser and test these routes:

| URL | Expected |
|-----|----------|
| `/admin/customers` | Customer list (empty at first) |
| `/admin/customers/new` | Create form |
| `/admin/customers/new` → enter phone → wait 600ms | Duplicate check runs silently |
| Create a customer → submit | Redirects to profile page |
| `/admin/customers/:id` | Profile with identity, notes, leads/deals sections |
| `/admin/customers/:id/edit` | Edit form pre-filled |
| Profile → Blacklist button | Modal appears, requires reason ≥ 5 chars |
| Profile → blacklisted customer | Red banner shows reason, Remove Blacklist button |

---

## Notes for Phase 4 (CRM — Leads)

- The **New Lead** link on the customer profile already pre-fills `?customer_id=` — Phase 4 should read this param.
- The **New Deal** link similarly pre-fills `?customer_id=` for Phase 5.
- The leads and deals tables on the profile page are placeholders — they will populate automatically once Phase 4 and 5 routes exist and data is created.
- The `financial_summary` block on the profile already calculates from `deals` table — no extra work needed in Phase 5.


Alright. Here’s your **Phase 0 — Foundation Setup**, rewritten properly, fully detailed, zero gaps, zero guessing. If this breaks, it’s because you skipped something. Read it carefully. Execute it exactly. 🔥

---

# 🚗 DMS — Phase 0: Foundation Setup (Complete Technical Guide)

This phase builds the **entire security + infrastructure base**:

* Database schema
* Storage
* Auth (Password + MFA)
* Backend API
* Frontend App
* Audit logging
* Deployment
* Security hardening

If Phase 0 is sloppy, everything built on top will be garbage. So do it clean.

---

# 1️⃣ System Overview

## Tech Stack

| Layer              | Tech                           | Purpose                |
| ------------------ | ------------------------------ | ---------------------- |
| Database           | Supabase (Postgres 15)         | Primary data storage   |
| Auth               | Supabase Auth + TOTP MFA       | Secure login           |
| Backend            | Node.js + Express (TypeScript) | API layer              |
| Frontend           | Next.js (App Router)           | UI                     |
| Hosting (Backend)  | Render                         | API hosting            |
| Hosting (Frontend) | Vercel                         | UI hosting             |
| Storage            | Supabase Storage               | Media + Docs + Backups |

---

# 2️⃣ Supabase Project Setup

Go to:

👉 [https://supabase.com](https://supabase.com)
Create a **New Project**

### Choose Region

Pick closest to your users.
For Sri Lanka → Southeast Asia is fine.

---

## Save These Immediately

From Project Settings → API:

* `SUPABASE_URL`
* `SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`

You will use:

* Anon → Frontend
* Service role → Backend only

If you leak the service role into frontend, you deserve the hack.

---

# 3️⃣ Storage Buckets Setup

In Supabase → **Storage**

Create:

| Bucket Name      | Access  | Purpose               |
| ---------------- | ------- | --------------------- |
| `vehicle-media`  | Public  | Car images            |
| `customer-docs`  | Private | Contracts / ID copies |
| `system-backups` | Private | Automated backups     |

Important:

* Only `vehicle-media` is public.
* Everything else must stay private.

---

# 4️⃣ Auth Configuration

Go to:

Supabase → Authentication → Settings

### Disable:

* ❌ Email Confirmations
* ❌ Self Signup

This is an internal system. No public registration.

---

### Enable MFA

Authentication → Multi-factor Auth

Enable:

* ✅ TOTP (Time-based One-Time Password)

This enables Google Authenticator / Authy style login.

---

# 5️⃣ Database Migration Execution

Go to Supabase → SQL Editor

Run files **in exact order**:

```
db-migrations/001_initial_schema.sql
db-migrations/002_add_indexes.sql
db-migrations/003_rls_policies.sql
db-migrations/004_triggers.sql
```

If you run them out of order, don’t cry when it breaks.

---

## After Running

Verify in Table Editor:

You should see **18 tables**, including:

* employees
* employee_permissions
* vehicles
* customers
* leads
* deals
* payments
* audit_logs
* inventory
* etc.

If audit_logs table does not exist, stop. Fix it.

---

# 6️⃣ Create First Admin User (Critical)

## Step 1 — Create Supabase Auth User

Supabase → Authentication → Users → Add User

Fill:

Email: `admin@yourdealership.com`
Password: temporary (must change later)

Click Create.

Copy the UUID.

---

## Step 2 — Insert Employee Record

In SQL Editor:

```sql
INSERT INTO employees (
  auth_user_id,
  employee_code,
  full_name,
  email,
  join_date,
  role,
  must_change_password
)
VALUES (
  'PASTE-UUID-HERE',
  'EMP001',
  'System Admin',
  'admin@yourdealership.com',
  CURRENT_DATE,
  'admin',
  true
);
```

---

### What Happens Automatically

* Trigger creates employee_permissions row
* Admin gets full access
* must_change_password = true forces reset

---

# 7️⃣ Backend Setup — dms-api

## Folder Structure

```
dms-api/
├── src/
│   ├── config.ts
│   ├── app.ts
│   ├── server.ts
│   ├── lib/supabase.ts
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── types/
```

---

## Environment File

Inside `dms-api`:

```
cp .env.example .env
```

Fill:

```
NODE_ENV=development
PORT=4000

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=generate-64-char-random
JWT_EXPIRES_IN=8h

ALLOWED_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
```

Generate JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Install + Run

```bash
npm install
npm run dev
```

Check:

```
http://localhost:4000/health
```

If it doesn’t return OK → don’t proceed.

---

# 8️⃣ Deploy Backend to Render

## Push to GitHub

Create new repo: `dms-api`

Push only backend.

---

## In Render

New → Web Service
Connect GitHub repo.

Build command:

```
npm install && npm run build
```

Start command:

```
node dist/server.js
```

---

## Add Environment Variables in Render

Add ALL variables from `.env`.

Do NOT paste them as one block.
Each variable needs:

NAME → VALUE

Example:

| Name                      | Value                                                  |
| ------------------------- | ------------------------------------------------------ |
| SUPABASE_URL              | [https://xxxxx.supabase.co](https://xxxxx.supabase.co) |
| SUPABASE_SERVICE_ROLE_KEY | long-secret                                            |
| JWT_SECRET                | long-secret                                            |
| ALLOWED_ORIGIN            | [https://your-vercel-url](https://your-vercel-url)     |

---

After deploy:

Test:

```
https://your-api.onrender.com/health
```

Must return OK.

---

# 9️⃣ Frontend Setup — dms-web

## Structure

```
dms-web/
├── src/
│   ├── middleware.ts
│   ├── app/
│   │   ├── (auth)/
│   │   ├── admin/
│   │   └── layout.tsx
│   ├── lib/
│   └── hooks/
```

---

## Environment Setup

```
cp .env.example .env.local
```

Fill:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Run Local

```
npm install
npm run dev
```

Visit:

```
http://localhost:3000
```

---

# 🔟 Deploy Frontend to Vercel

Push to new repo: `dms-web`

In Vercel:

Import project.

Add environment variables:

* NEXT_PUBLIC_SUPABASE_URL
* NEXT_PUBLIC_SUPABASE_ANON_KEY
* NEXT_PUBLIC_API_URL (Render URL)

Deploy.

---

# 1️⃣1️⃣ Update Backend CORS

In Render, update:

```
ALLOWED_ORIGIN=https://your-vercel-app.vercel.app
```

Redeploy.

If you forget this, your API calls will fail.

---

# 1️⃣2️⃣ First Login Flow (Complete Auth Flow)

1. Visit Vercel URL
2. Redirect → `/login`
3. Enter email + temp password
4. Redirect → `/change-password`
5. Set new password
6. Redirect → `/setup-mfa`
7. QR code appears
8. Scan with Google Authenticator
9. Enter 6-digit code
10. MFA verified
11. Redirect → `/admin`

---

### Future Login Flow

Login → Password
If MFA exists → challenge
Enter TOTP → backend checks `aal=aal2`
Access granted.

---

# 🔐 Auth Security Logic

Frontend:

* Uses Supabase client
* Gets JWT
* Sends Bearer token to backend

Backend:

* Verifies JWT
* Confirms `aal=aal2`
* Loads employee from DB
* Applies RBAC

If aal ≠ aal2 → reject.

---

# 📜 Audit Log System

Every sensitive action inserts into:

`audit_logs`

Columns:

* id
* action
* entity
* entity_id
* performed_by
* timestamp
* prev_hash
* row_hash

Each row links to previous hash.

This creates a tamper-evident chain.

`auditService.verifyChain()` validates integrity.

RLS:

* INSERT allowed
* SELECT allowed
* UPDATE blocked
* DELETE blocked

Nobody edits history.

---

# 📁 Final Directory Layout

```
root/
├── dms-api/
├── dms-web/
└── db-migrations/
```

Keep repos separate.

Never mix frontend + backend in same repo unless you enjoy chaos.

---

# ✅ Phase 0 Final Validation Checklist

* Supabase project created
* 3 storage buckets created
* 4 SQL migrations ran
* 18 tables exist
* Admin inserted in employees
* Backend running on Render
* /health endpoint works
* Frontend deployed on Vercel
* CORS configured
* Admin login works
* Password change forced
* MFA enrollment works
* Audit logs inserting records

If any checkbox is false, you are not done.

---

# 🚨 Non-Negotiable Rules

* Service role key → backend only
* Anon key → frontend only
* No RLS disabled
* No public signup
* No skipping MFA
* No storing secrets in GitHub

Break these and your system is trash.

---

Phase 0 is your foundation.
If this is solid, Phase 1 becomes easy.
If this is weak, everything collapses. 💀🔥

When you're ready, we can tear apart Phase 1 next.

RESET PASSWORD PROBLEM
DMS Web — Environment Variables Setup
Required Environment Variables
For each new deployment (each dealership), the following environment variables
must be configured in the Vercel dashboard and in the local .env.local file.

Vercel Dashboard Setup
Go to: Vercel → Project → Settings → Environment Variables
VariableDescriptionExampleNEXT_PUBLIC_SUPABASE_URLSupabase project URLhttps://xxxx.supabase.coNEXT_PUBLIC_SUPABASE_ANON_KEYSupabase anon/public keyeyJhbG...NEXT_PUBLIC_API_URLBackend API URL (Render)https://dms-api-xxx.onrender.comNEXT_PUBLIC_SITE_URLThis deployment's live URL — used for password reset email linkshttps://dms-web-xxx.vercel.app

⚠️ If NEXT_PUBLIC_SITE_URL is missing or wrong, the forgot password
email will send a reset link pointing to the wrong URL and it will not work.


Local .env.local Setup
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

Supabase Dashboard Setup
For each new Supabase project go to:
Authentication → URL Configuration → Redirect URLs
Add the following:
https://your-deployment.vercel.app/admin/reset-password
http://localhost:3000/admin/reset-password

⚠️ Without adding the redirect URL in Supabase, the password reset link
in the email will be blocked by Supabase and will not work.


Checklist for each new customer deployment

 Create new Supabase project
 Run all 5 DB migrations in order
 Add redirect URL in Supabase dashboard
 Create Vercel deployment from same repo
 Set all 4 environment variables in Vercel
 Deploy backend API on Render with correct env variables
 Create first admin employee in Supabase SQL editor
 Test login → MFA setup → dashboard flow



 Here's the section to add to your DEPLOYMENT.md:
markdown## Supabase URL Configuration
Go to: Supabase → Authentication → URL Configuration

### Site URL
Set this to the deployment's live URL:
```
https://your-deployment.vercel.app
```

### Redirect URLs
Click "Add URL" and add both:
```
https://your-deployment.vercel.app/admin/reset-password
http://localhost:3000/admin/reset-password
```

> ⚠️ Without Site URL set, Supabase does not know where to redirect after
> email verification. Without Redirect URLs, Supabase blocks the redirect
> entirely and the password reset link in the email will not work.

> ⚠️ This must be done for EVERY new customer deployment with their
> specific Vercel URL. It is the most commonly missed step.
Add it under the existing Supabase Dashboard Setup section in your DEPLOYMENT.md. Just open the file and paste it in after the redirect URLs checklist.





# Phase 4 — CRM: Lead Management

> **Depends on:** Phase 0 (Auth + DB), Phase 2 (Inventory), Phase 3 (Customers)
> **Color:** `#10b981` (Green)
> **Route prefix:** `/leads` (API), `/admin/crm` (Frontend)

---

## What This Phase Delivers

- Full lead pipeline: New → Contacted → Interested → Test Drive → Negotiation → Won / Lost
- Role-based visibility — salesperson sees only their own leads; manager/admin sees all
- Real-time overdue badge on the CRM nav item
- Due-today banner at the top of the lead list
- Follow-up logging with timestamped history timeline
- Lost reason tracking with optional note (required when marking lost)
- Lead reassignment (manager/admin only)
- Customer lookup — search and link an existing customer profile
- Vehicle picker — search live inventory and attach to a lead
- Auto-fill salesperson when logged in as salesperson role
- Soft delete (manager/admin only)

---

## Files Created

### Backend — `dms-api`

| File | Action | Description |
|------|--------|-------------|
| `src/services/crm.service.ts` | **NEW** | Full CRUD, pipeline transitions, overdue/due-today queries, follow-ups, vehicle + salesperson search |
| `src/routes/crm.routes.ts` | **NEW** | All 11 CRM endpoints with Zod validation and role guards |
| `src/app.ts` | **EDIT** | Add 1 import + 1 `app.use('/leads', crmRoutes)` line |

### Frontend — `dms-web`

| File | Action | Description |
|------|--------|-------------|
| `src/lib/api.ts` | **EDIT** | Append CRM types + `leadApi` from `api.crm.ts` |
| `src/app/admin/crm/page.tsx` | **NEW** | Lead list with pipeline tabs, overdue toggle, due-today banner |
| `src/app/admin/crm/new/page.tsx` | **NEW** | Create form — customer search, vehicle picker, salesperson assign |
| `src/app/admin/crm/[id]/page.tsx` | **NEW** | Detail page — pipeline control, follow-up form, history timeline |
| `src/app/admin/crm/[id]/edit/page.tsx` | **NEW** | Edit form |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/leads` | Any role | List (salesperson sees own, manager/admin sees all) |
| `GET` | `/leads/overdue` | Any role | Leads where follow-up date < today |
| `GET` | `/leads/due-today` | Any role | Leads with follow-up date = today |
| `GET` | `/leads/salespersons` | Any role | Active staff for assign dropdown |
| `GET` | `/leads/vehicles/search?q=` | Any role | Search inventory vehicles |
| `GET` | `/leads/:id` | Any role | Full detail with follow-ups, vehicle, customer |
| `POST` | `/leads` | Any role | Create lead |
| `PUT` | `/leads/:id` | Any role | Update lead |
| `PATCH` | `/leads/:id/status` | Any role | Move pipeline stage (lost requires reason) |
| `PATCH` | `/leads/:id/assign` | Manager / Admin | Reassign to different employee |
| `DELETE` | `/leads/:id` | Manager / Admin | Soft delete |
| `GET` | `/leads/:id/follow-ups` | Any role | List follow-up history |
| `POST` | `/leads/:id/follow-ups` | Any role | Log a follow-up |

---

## Pipeline Stages

```
new → contacted → interested → test_drive → negotiation → won
                                                        ↘ lost (from any stage except won)
```

- Moving to **lost** opens a modal requiring a reason (price_too_high / competitor / not_interested / financing_rejected / other)
- Moving to **won** is a one-click action from negotiation (full deal linking happens in Phase 5)
- All other moves are free — forward or backward

---

## Step-by-Step Integration

### 1. Copy backend files

```powershell
Copy-Item "phase4\dms-api\src\services\crm.service.ts" "dms-api\src\services\crm.service.ts"
Copy-Item "phase4\dms-api\src\routes\crm.routes.ts"    "dms-api\src\routes\crm.routes.ts"
```

### 2. Edit `dms-api/src/app.ts`

Add these two lines:

```typescript
// Top import section:
import crmRoutes from "./routes/crm.routes";

// Routes section (after customerRoutes):
app.use("/leads", crmRoutes);   // Phase 4
```

### 3. Append to `dms-web/src/lib/api.ts`

Open `api.ts` and paste the full contents of `phase4/dms-web/src/lib/api.crm.ts`
at the **very bottom** of the file (after the closing brace of `customerApi`).
Remove the comment header at the top of the snippet before pasting.

### 4. Copy frontend pages

```powershell
Copy-Item "phase4\dms-web\src\app\admin\crm\page.tsx" `
          "dms-web\src\app\admin\crm\page.tsx"

Copy-Item "phase4\dms-web\src\app\admin\crm\new\page.tsx" `
          "dms-web\src\app\admin\crm\new\page.tsx"

Copy-Item "phase4\dms-web\src\app\admin\crm\[id]\page.tsx" `
          "dms-web\src\app\admin\crm\[id]\page.tsx"

Copy-Item "phase4\dms-web\src\app\admin\crm\[id]\edit\page.tsx" `
          "dms-web\src\app\admin\crm\[id]\edit\page.tsx"
```

---

## Create All New Files From Scratch (PowerShell)

Run this in the VS Code terminal from your **project root** to create every folder
and blank file, then open them all at once:

```powershell
# ── Backend ────────────────────────────────────────────────────
New-Item -ItemType File -Force "dms-api\src\services\crm.service.ts"
New-Item -ItemType File -Force "dms-api\src\routes\crm.routes.ts"

# ── Frontend ───────────────────────────────────────────────────
New-Item -ItemType File -Force "dms-web\src\app\admin\crm\page.tsx"
New-Item -ItemType File -Force "dms-web\src\app\admin\crm\new\page.tsx"
New-Item -ItemType File -Force "dms-web\src\app\admin\crm\[id]\page.tsx"
New-Item -ItemType File -Force "dms-web\src\app\admin\crm\[id]\edit\page.tsx"

# ── Open ALL new + edited files in VS Code ─────────────────────
code "dms-api\src\services\crm.service.ts"
code "dms-api\src\routes\crm.routes.ts"
code "dms-api\src\app.ts"
code "dms-web\src\lib\api.ts"
code "dms-web\src\app\admin\crm\page.tsx"
code "dms-web\src\app\admin\crm\new\page.tsx"
code "dms-web\src\app\admin\crm\[id]\page.tsx"
code "dms-web\src\app\admin\crm\[id]\edit\page.tsx"
```

---

## Only the Two Files to Edit (not replace)

```powershell
code "dms-api\src\app.ts"
code "dms-web\src\lib\api.ts"
```

**`dms-api/src/app.ts`** — Add 1 import at the top, add 1 `app.use` line in the routes section.

**`dms-web/src/lib/api.ts`** — Paste the contents of `api.crm.ts` at the very bottom.

---

## Verify After Deploy

| URL | Expected |
|-----|----------|
| `/admin/crm` | Lead list (empty at first, pipeline tabs visible) |
| `/admin/crm` | Due-today banner shows if any leads have today's date |
| `/admin/crm` → overdue toggle | Filters to overdue leads only |
| `/admin/crm/new` | Form with customer search + vehicle picker dropdowns |
| Create a lead | Redirects to detail page |
| Detail page | Pipeline buttons visible, follow-up form on right |
| Click pipeline stage | Status changes immediately |
| Click "Lost ✗" | Modal opens requiring a reason |
| Log a follow-up | Appears in timeline below the form |
| `/admin/customers/:id` | "+ New Lead" button now works (pre-fills customer) |

---

## Notes for Phase 5 (Sales / Deals)

- The **"Won ✓"** button on the pipeline currently just sets `status = 'won'`
- In Phase 5, completing a deal will automatically set the linked lead's status to `won` and populate `won_deal_id`
- The **"+ New Deal"** link on the customer profile passes `?customer_id=` — Phase 5 reads this
- `leads.interested_vehicle_id` is already set — Phase 5 can pre-fill the vehicle on the deal form
