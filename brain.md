# 🧠 Project Brain

> This file is the canonical context document for this project. Any AI assistant or new collaborator should read this file first before touching any code. Keep it updated as the project evolves — treat it as living documentation, not a one-time snapshot.

**Last updated:** 2026-08-21
**Maintained by:** Pratham Dahiya (Batch Admin)

---

## 1. What This Project Is
- **EEE Batch Pulse** is a real-time class timeline, daily lecture notes/highlights feed, recurring timetable manager, batch community chat, and automated push alert system created specifically for Electrical & Electronics Engineering students (**UIT RGPV Bhopal, B.Tech I SEM, Section EX, Room 106**).
- It eliminates the noise and fragmentation of messaging groups by providing a single, glassmorphism-styled progressive dashboard showing what class is happening right now, countdowns to the next slot, high-priority status changes (e.g. Cancellations, Delays, Mass Bunks), shared study notes, and curated book recommendations.
- **Current stage:** Production-ready Web Application / Active MVP.

## 2. Tech Stack
- **Languages & Frameworks:** TypeScript 6.0.3, Next.js 16.3.1 (App Router, Server Actions, Server Components), React 19.2.8.
- **Database & Backend Services:** Supabase (PostgreSQL 15+, Supabase Realtime, Supabase Storage, Supabase Auth).
  - Accessed via `@supabase/ssr` (v0.12.4) and `@supabase/supabase-js` (v2.112.3).
- **Styling & UI:** Tailwind CSS v4 (`@tailwindcss/postcss` v4.3.3) with `@theme` design tokens in `src/app/globals.css`, PostCSS 8.5.26, custom Pink & White glassmorphism design system (`#FFF6FA`, `#FF4F9A`, `#C2185B`, `#3D2C36`), Google Fonts (`Outfit`, `Plus Jakarta Sans`, `IBM Plex Mono`).
- **Real-time & Messaging:** Supabase Realtime Channels (`postgres_changes` on `messages` table for zero-latency batch chat).
- **Push Notifications:** Web Push API (`web-push` v3.6.7) with VAPID authentication and a background Service Worker (`public/sw.js`).
- **Cron Jobs:** Vercel Cron via `vercel.json` (`*/5 * * * *` calling `/api/cron/check-timetable`).
- **Deployment Target:** Vercel (Edge/Serverless) + Supabase Cloud.
- **Package Manager & Build Tool:** `npm`, Next.js build (`next build`).

## 3. Project Structure
```
/
├── public/                     → Static assets and Service Worker
│   └── sw.js                   → Background push notification handler & click-to-focus router
├── src/
│   ├── app/                    → Next.js App Router routes & layouts
│   │   ├── layout.tsx          → Root layout: Ambient gradient mesh, NowNextBar, NotificationPrompt
│   │   ├── page.tsx            → Home page: Today's timeline, quick subject chips, post feed
│   │   ├── globals.css         → Tailwind v4 theme, glassmorphism tokens, keyframe animations
│   │   ├── admin/              → Admin dashboard & protected routes
│   │   │   ├── layout.tsx      → Admin layout with session verification & sign-out
│   │   │   ├── page.tsx        → Server component fetching today's schedule overrides
│   │   │   ├── AdminDashboardClient.tsx → Post creator (image drag/drop/paste) & schedule editor
│   │   │   └── login/page.tsx  → Admin authentication screen
│   │   ├── api/                → API route handlers
│   │   │   ├── cron/check-timetable/route.ts → 5-min cron calculating IST upcoming classes & firing push alerts
│   │   │   └── subscribe/route.ts            → Push notification subscription registration & unsubscription
│   │   ├── books/page.tsx      → Curated book recommendations grouped by subject
│   │   ├── chat/page.tsx       → Public community live chat page
│   │   ├── day/[date]/page.tsx → Historical day timeline view (YYYY-MM-DD)
│   │   ├── subject/[subject]/page.tsx → Filtered posts & materials for a specific subject
│   │   └── timetable/          → Weekly timetable explorer with B1/B2 batch filters
│   │       ├── page.tsx        → Timetable page wrapper
│   │       └── TimetableClient.tsx → Interactive weekly schedule viewer & batch selector
│   ├── components/ui/          → Reusable UI components
│   │   ├── TopBar.tsx          → Sticky top navigation bar with date navigator & relative day label
│   │   ├── NowNextBar.tsx      → Sticky live indicator bar calculating running/upcoming class & countdown
│   │   ├── LiveChat.tsx        → Real-time chat client with Supabase Realtime, nicknames, cooldowns
│   │   ├── NotificationPrompt.tsx → Soft onboarding prompt for browser push notifications
│   │   ├── PostFeed.tsx        → Feed container rendering post lists or empty states
│   │   ├── PostCard.tsx        → Post card component (type badges, images, timestamps, author)
│   │   ├── ScheduleStrip.tsx   → Horizontal scrolling strip of today's schedule status chips
│   │   ├── ImageGallery.tsx    → Multi-image grid with interactive full-screen lightbox
│   │   ├── StatusLED.tsx       → Animated glowing status indicator badge
│   │   └── SubjectTag.tsx      → Monospace clickable subject pill
│   ├── lib/                    → Shared logic, server actions, data, and database clients
│   │   ├── actions.ts          → Server Actions for post creation, overrides, and admin auth
│   │   ├── constants.ts        → App constants, subjects list, status configurations, date formatters
│   │   ├── push-server.ts      → Server-side Web Push dispatcher with batch preference filtering
│   │   ├── queries.ts          → Cached server-side read queries for Supabase data
│   │   ├── timetable-data.ts   → Canonical weekly timetable schedule (Section EX) & live slot math
│   │   ├── types.ts            → TypeScript interfaces and data models
│   │   └── supabase/           → Supabase client factories and middleware
│   │       ├── config.ts       → Resilient URL normalizer & environment validator
│   │       ├── client.ts       → Browser Supabase client (`createBrowserClient`)
│   │       ├── server.ts       → Server Component/Action Supabase client (`createServerClient`)
│   │       └── middleware.ts   → Edge session refresher and `/admin` route guard
│   └── proxy.ts                → Next.js proxy request forwarder invoking Supabase middleware
├── supabase/
│   └── schema.sql              → Full PostgreSQL schema, RLS policies, realtime publications, seed data
├── vercel.json                 → Vercel cron configuration (`*/5 * * * *`)
└── package.json                → Project dependencies and scripts
```

## 4. Architecture & Data Flow
- **Data Model Layers:**
  1. **Static Timetable Layer (`timetable-data.ts` + `public.timetable`):** Defines weekly recurring classes, timings, faculty, rooms, and batches (B1/B2/ALL).
  2. **Daily Overrides Layer (`public.days` + `public.schedule_entries`):** Dynamic day-specific status overrides created by batch admins (`happened`, `delayed`, `cancelled`, `mass_bunk`).
  3. **Daily Content Layer (`public.posts` + `public.admins`):** Admin-uploaded notes, highlights, book recommendations, and reviews with image arrays uploaded to Supabase Storage (`post-images` bucket).
  4. **Community Realtime Layer (`public.messages`):** Real-time public messages broadcast across all clients via Supabase Realtime PostgreSQL replication.
  5. **Notification Subscription Layer (`public.push_subscriptions`):** Stores anonymous browser push subscription objects paired with batch preferences (`ALL`, `B1`, `B2`).

- **End-to-End User Flows:**
  - **Live Class Tracking:**
    ```
    User opens App → NowNextBar initializes with server overrides → Runs computeLiveSlotState() against local clock & overrides → Re-calculates every 30s → Shows live class name, room, and countdown ("ends in 25m" / "starts in 10m").
    ```
  - **Admin Class Status Override:**
    ```
    Admin logs in at /admin/login → Updates slot status to 'cancelled'/'mass_bunk'/'delayed' → updateScheduleEntry() Server Action modifies schedule_entries table → revalidatePath('/') revalidates server caches → Instant high-priority push notification sent to all batch subscribers via sendPushNotificationToAll().
    ```
  - **Automated Class Reminder Cron:**
    ```
    Vercel Cron hits /api/cron/check-timetable every 5m → Converts UTC to Indian Standard Time (UTC+5:30) → Finds timetable slots starting in 2-8 minutes → Skips cancelled/mass_bunk slots → Dispatches web push notification to relevant batch devices.
    ```
  - **Real-Time Batch Chat:**
    ```
    User opens /chat → Subscribes to Supabase Realtime channel 'realtime:public:messages' → Sends message via Supabase client insert → Supabase triggers WebSocket broadcast to all connected clients → Message renders with avatar color hash and auto-scroll.
    ```

## 5. Conventions & Patterns
- **Next.js App Router & Server Actions:**
  - Data fetching for pages is performed directly in async Server Components via `src/lib/queries.ts`.
  - Data mutations are performed using Next.js Server Actions with `'use server'` in `src/lib/actions.ts`.
  - Cache revalidation is handled explicitly via `revalidatePath(...)` after database writes.
- **Supabase Configuration & Resilience:**
  - Always resolve Supabase URLs and keys through `getSupabaseConfig()` in `src/lib/supabase/config.ts` to automatically strip erroneous `/rest/v1` suffixes and provide safe build-time fallbacks.
  - Queries in `src/lib/queries.ts` use try-catch blocks with graceful fallbacks so the app renders reliably even during network or database anomalies.
- **Styling Conventions:**
  - Color palette is strictly Pink & White glassmorphism: Canvas `#FFF6FA`, Primary Pink `#FF4F9A`, Deep Rose `#C2185B`, Plum `#3D2C36`, Blush `#FFD9E8`.
  - Use custom glass classes defined in `globals.css`: `.glass-card`, `.glass-nav`, `.glass-strip`, `.glass-pill`, `.glass-btn-primary`, `.glass-input`.
  - Monospace font (`font-mono`) is used for dates, timecodes, batch tags, status labels, and chips.
  - Headings use `font-display` (`Outfit`). Body uses `font-body` (`Plus Jakarta Sans`).
- **Naming Conventions:**
  - Files: PascalCase for React UI components (`PostCard.tsx`, `NowNextBar.tsx`), kebab-case for utilities and route folders (`timetable-data.ts`, `check-timetable/`).
  - Database: snake_case for tables and column names (`day_of_week`, `start_time`, `image_urls`, `schedule_entries`).

## 6. Environment & Setup
- **Required Environment Variables (in `.env.local`):**
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (e.g. `https://xyzcompany.supabase.co`).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public anonymous key.
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: VAPID public key for Web Push notifications.
  - `VAPID_PRIVATE_KEY`: VAPID private key for backend push signing.
  - `VAPID_SUBJECT`: Contact email URI for VAPID (e.g. `mailto:admin@example.com`).

- **Local Development Setup:**
  1. Clone repository.
  2. Run `npm install`.
  3. Copy `.env.local.example` to `.env.local` and populate variables.
  4. Run SQL migrations in Supabase SQL editor using `supabase/schema.sql`.
  5. Run `npm run dev` to start Next.js development server at `http://localhost:3000`.

- **External Services & Integrations:**
  - **Supabase:** Database, Authentication, Realtime, and File Storage.
  - **Vercel:** Hosting and Cron execution.
  - **Web Push Services:** Google FCM / Apple APNs / Mozilla Push Services via `web-push`.

## 7. Current State
- **Fully Working Features:**
  - Interactive Live Timeline showing today's class schedule and posts.
  - Live Now/Next bar with dynamic 30-second ticking countdown and schedule override banner.
  - Full weekly timetable viewer with day switcher (Mon-Fri) and batch selector (ALL / B1 / B2).
  - Admin dashboard with multi-image drag-and-drop / clipboard paste upload, post creator, and one-click status overrides (Happened, Delayed, Cancelled, Mass Bunk).
  - Admin email/password authentication backed by Supabase Auth and RLS admin role checks.
  - Public Real-time Batch Chat with custom display names, rate limiting (3s cooldown), message length validation (max 500 chars), and auto-scrolling.
  - Subject-specific archives (`/subject/[subject]`) and date-based archives (`/day/[date]`).
  - Book recommendation gallery (`/books`) categorized by subject.
  - Web Push Notification subscription manager with soft onboarding prompt and background service worker (`sw.js`).
  - Automated 5-minute Vercel Cron checker dispatching upcoming class notifications in IST timezone.
- **Known Technical Debt / Edge Cases:**
  - If no admin initializes today's schedule entries, the Now/Next bar falls back to the static timetable without showing override chips on the homepage until created.
  - VAPID keys must be generated and added to `.env.local` for push notifications to function.

## 8. Decisions & Rationale
- **Hybrid Timetable Architecture:**
  - *Decision:* Hardcode the verified recurring weekly timetable in `src/lib/timetable-data.ts` (with matching seed data in SQL) rather than querying the database on every client tick.
  - *Rationale:* Eliminates database roundtrips for live clock countdowns and guarantees sub-millisecond calculation of the active class slot while still allowing dynamic overrides from `schedule_entries`.
- **Anonymous Batch Chat with Local Nicknames:**
  - *Decision:* Students do not need to register an account or log in to participate in `/chat`; display names are persisted in browser `localStorage`.
  - *Rationale:* Maximizes engagement by removing login friction while maintaining safety through strict character limits (500 chars), client cooldown timers, and sanitized storage.
- **Web Push API instead of WhatsApp/Telegram Bots:**
  - *Decision:* Native browser push notifications using standard Web Push protocols.
  - *Rationale:* Zero recurring subscription/API cost, no risk of third-party bot bans, and seamless cross-platform integration across Android Chrome, iOS Safari (PWA), and Desktop browsers.
- **Pink & White Glassmorphism Design System:**
  - *Decision:* Custom glass tokens with backdrop-blur, subtle ambient gradient mesh blobs, and glowing LEDs.
  - *Rationale:* Creates a distinct, premium, visually engaging aesthetic that stands out from standard corporate or default UI templates.

## 9. Roadmap / Next Steps
- [ ] Add PWA Web App Manifest (`manifest.json`) with install prompts and app icons for native home screen installation.
- [ ] Implement timetable management UI in the Admin Dashboard to edit weekly slots if semester schedules change.
- [ ] Add PDF attachment and lecture slide preview support for posts.
- [ ] Add search bar for quickly searching notes across all subjects.
- [x] Add attendance percentage calculator / bunk manager tool for students (`/attendance`).

## 10. Glossary
- **Section EX:** The Electrical & Electronics Engineering class section at UIT RGPV Bhopal.
- **B1 / B2:** Practical / Lab sub-batches for parallel lab sessions (e.g. Manufacturing Lab vs. Engineering Graphics Lab).
- **Mass Bunk:** Collective decision by the batch not to attend a lecture or lab, highlighted in deep rose with glowing alert badges.
- **Now/Next Bar:** The persistent top bar calculating the currently active period and next upcoming period with real-time countdowns.
- **Override:** A dynamic status change entered by a class admin modifying a regular timetable slot for a specific date.

## 11. Notes for AI Assistants
- **Strictly Preserve Next.js 16+ & React 19 Standards:** Do not downgrade dependencies or use deprecated Next.js patterns (e.g. `pages/` directory conventions).
- **Supabase Client Instantiation:** Never instantiate `@supabase/supabase-js` or `@supabase/ssr` directly with raw `process.env` in server code; always route through `getSupabaseConfig()` in `src/lib/supabase/config.ts` or use `createClient()` from `src/lib/supabase/server.ts` or `src/lib/supabase/client.ts`.
- **Maintain Design System Tokens:** All new components must adhere to the Pink & White glassmorphism aesthetic (`glass-card`, `glass-nav`, `glass-strip`, `glass-btn-primary`, `#FF4F9A`, `#C2185B`, `#3D2C36`). Do not introduce generic Tailwind gray cards.
- **Timezone Awareness:** Timetable operations and cron job calculations must consistently operate in **Indian Standard Time (IST / UTC +5:30)**.
- **Database Migrations:** Any table or schema alterations must be reflected synchronously in `supabase/schema.sql` and `src/lib/types.ts`.
