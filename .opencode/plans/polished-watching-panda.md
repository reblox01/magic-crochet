# Full Feature Implementation Plan

## Context
User wants 5 new features + post-implementation health check. This is a major expansion of the admin panel.

## Implementation Order (dependencies flow top → bottom)

### Phase 1: Database Migrations
All SQL changes needed before any code:

**A) admin_users additions:**
```sql
ALTER TABLE admin_users ADD COLUMN last_active_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN avatar_url TEXT;
```

**B) activity_log table:**
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout'
  entity_type TEXT NOT NULL, -- 'product', 'order', 'contact', 'reservation', etc.
  entity_id TEXT,
  entity_name TEXT, -- human-readable name of the entity
  details JSONB, -- optional: { field: 'in_stock', old: true, new: false }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
```

**C) notifications table:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'contact', 'reservation', 'order', 'system'
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

**D) contact_replies table (or add to contacts):**
```sql
CREATE TABLE contact_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sent_by TEXT NOT NULL, -- email address of sender
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_contact_replies_contact ON contact_replies(contact_id);
```

**E) Enable Supabase Presence + Realtime:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  products, gallery_images, avis, reviews,
  partnerships, app_settings, orders, contacts,
  reservations, ateliers, notifications, activity_log;
```

---

### Phase 2: Server Functions

**A) Activity logging helper** — `src/lib/activity-log.ts`
- `logActivity({ action, entityType, entityId, entityName, details? })` — inserts into `activity_log` with current user info from auth

**B) Add activity logging to existing mutations** — modify these server functions to call `logActivity` after successful mutations:
- `-products.ts`: create, update, delete
- `-partnerships.ts`: create, update, delete
- `-gallery.ts`: create, update, delete
- `-reviews.ts`: create, update, delete
- `-avis.ts`: create, update, delete
- `-orders.ts`: status change, paid toggle
- `-ateliers.ts`: create, update, delete, bulk update
- `-contacts.ts`: status change (replied)
- `-admin-users.ts`: invite, update role, delete

**C) Notification creation** — add to server functions:
- `-contact.ts` `submitContact`: create notification for owner/admin when new contact arrives
- `-admin-bookings.ts`: create notification when new reservation arrives
- `-orders.ts` `checkoutCreate`: create notification when new order arrives

**D) Profile server functions** — `src/routes/api/-profile.ts`:
- `updateProfile({ display_name, avatar_url })` — updates current user
- `changePassword({ currentPassword, newPassword })` — changes password via Supabase Auth

**E) Contact replies** — add to `-contact.ts`:
- `saveReply({ contactId, body, sentBy })` — saves reply to `contact_replies` table
- Update `sendReply` to also save reply to DB

---

### Phase 3: UI Components

**A) Online status indicator** — `src/components/OnlineIndicator.tsx`
- Small green dot component
- Takes user ID, shows green if user's `last_active_at` is within last 2 minutes

**B) Profile page** — `src/routes/admin/profile.tsx`
- Displays avatar (first letter or uploaded image)
- Edit display name form
- Change password form
- Upload avatar (Supabase storage `avatars` bucket)

**C) Notifications** — replace dead menu item:
- Bell icon in admin header (`admin.tsx`) with unread count badge
- Dropdown with notification list
- Mark as read on click
- Real-time subscription to `notifications` table

**D) Activity log page** — `src/routes/admin/activities.tsx`
- Table with columns: Date, User, Action, Entity, Details
- Filters: by user, by action type, by entity type
- Pagination
- Owner-only access (role check in route)

**E) Contact inbox view** — modify `src/routes/admin/contacts.tsx`:
- Add "Inbox" button that switches to thread view
- Thread view: left panel (contact list), right panel (message thread with replies)
- Reply form at bottom of thread
- Search by name/email
- Reply persistence via `contact_replies` table

**F) Sidebar updates** — `src/components/admin-sidebar.tsx`:
- Add "Activités" nav item (owner only)
- Link "Profil" to `/admin/profile`
- Remove dead "Notifications" from dropdown (moved to header)

---

### Phase 4: Real-time Subscriptions

**A) `useRealtime` hook** — `src/hooks/useRealtime.ts`
- Subscribes to all 12 tables via Supabase channels
- Invalidates React Query keys on changes
- Also subscribes to `notifications` table for real-time badge updates

**B) Presence tracking** — in admin layout
- On mount, join Supabase Presence channel
- Update `last_active_at` every 30 seconds via heartbeat
- Track other online users

**C) Mount in admin layout** — `src/routes/admin.tsx`
- Call `useRealtime()` and `usePresence()` hooks

---

### Phase 5: Verification
1. `npx tsc --noEmit` — zero errors
2. Browser: test profile page (edit name, upload avatar, change password)
3. Browser: test activity log (make changes in admin, check they appear)
4. Browser: test notifications (submit contact form, check notification appears)
5. Browser: test contact inbox (open thread, send reply, check persistence)
6. Browser: test online status (open two admin tabs, verify green dots)
7. Post-implementation health check
