# Admin Dashboard & Backend Plan — Magic Crochet

## Architecture Summary
- **Auth**: Supabase Auth (like Agrivalor) — single auth system, RLS handles authorization
- **Database**: Supabase (PostgreSQL) — raw SQL schema, JS client
- **API**: TanStack Start `createServerFn` with Supabase Auth middleware
- **Storage**: Supabase Storage (product images, partnership logos)
- **UI**: shadcn sidebar-07, ported from Agrivalor's `admin-sidebar.tsx`
- **Email**: Resend via `createServerFn` (NOT Edge Functions)

## Phase 0: Migrate Forms to Supabase (NEW)
- **Contact form** (`src/routes/contact.tsx`): Replace `setSent(true)` with `createServerFn` → Supabase `contacts` insert
- **Demande form** (`src/routes/demande.tsx`): Same pattern → Supabase `contacts` insert
- **Booking form** (`src/routes/reserver.tsx`): Replace in-memory `bookings.ts` with `createServerFn` → Supabase `reservations` insert
- **Migration checklist**: Deploy schema WITHOUT RLS → verify public queries → enable RLS → verify admin queries

## Phase 1: Infrastructure Setup
1. Install `@supabase/supabase-js`
2. Create `src/lib/supabase.ts` — client + admin client
3. Add Supabase Auth middleware to `src/start.ts` (compose with existing `errorMiddleware`)
4. Create SQL schema in Supabase (7 tables + RLS + storage)
5. Create sign-in route (`src/routes/admin/login.tsx`)

## Phase 2: Database Schema
- **`products`** — id, name, description, price, image, category, in_stock, is_active, rating, reviews_count, created_at
- **`orders`** — id, customer info, total_amount, status, items (JSONB), created_at
- **`reservations`** — id, customer info, date, time, seats, format, status, notes, created_at
- **`contacts`** — id, name, email, phone, subject, message, status, created_at
- **`partnerships`** — id, name, url, logo_url, size, is_active, sort_order, created_at
- **`reviews`** — id, customer_name, rating, text, is_visible, created_at
- **`app_settings`** — key (TEXT PK), value (JSONB), updated_at

**Removed**: `admin_users` table → Supabase Auth `raw_user_meta_data` stores `is_admin`

## Phase 3: Admin Dashboard Layout
- `src/routes/admin.tsx` — layout route (createFileRoute, no path) with `<Outlet />` wrapping child routes
- `src/routes/admin/index.tsx` — dashboard analytics
- `src/components/admin/admin-sidebar.tsx` — shadcn sidebar-07, all labels in French
- Auth guard: Supabase Auth middleware on all admin server functions

## Phase 4: Admin Pages (10 pages)
1. **Tableau de bord** — analytics with Recharts (mock data first)
2. **Produits** — CRUD with image upload (Supabase Storage)
3. **Commandes** — table, status filter, inline update (admin-created from contact messages)
4. **Factures** — payment tracking (mark orders paid/unpaid)
5. **Réservations** — table, date filter
6. **Contacts** — inbox-style (messages from contact form)
7. **Partenaires** — CRUD with logo upload
8. **Avis** — visibility toggle
9. **Paramètres** — site config (maintenance mode, business hours)
10. **Utilisateurs** — admin management (owner-only)

## Phase 5: Server Functions
Pattern: `createServerFn` + Supabase Auth middleware

## Phase 6: File Uploads
- Product images → Supabase Storage `product-images` bucket (public read, 5MB, jpeg/webp/png)
- Partnership logos → Supabase Storage `partner-logos` bucket (same config)

## Accepted Expansions
- Automated email notifications (Resend via createServerFn)
- Real-time analytics (Recharts, mock data first)
- Mobile-responsive admin (sidebar collapse, responsive tables)
- Login rate limiting (5 attempts, 15-min lockout)
- Email failure handling (log + admin badge)

## Deployment
- Vercel (existing) + Supabase Cloud
- SQL schema runs in Supabase dashboard
- **RLS migration checklist**: Deploy schema → verify public queries → enable RLS → verify admin queries
