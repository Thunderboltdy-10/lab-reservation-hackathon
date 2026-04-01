# Lab Reservation and Management

School-ready lab operations platform built with Next.js, Clerk, Prisma, tRPC, and PostgreSQL.

It now covers:

- Seat reservations with session capacity enforcement
- Equipment allocation per session
- Equipment usage reporting after sessions end
- Attendance tracking and backlog review
- Teacher approval workflows for restricted students
- Reminder and summary emails for students and teachers
- Teacher operations dashboard for approvals, attendance, expiring stock, and reconciliation

## Core Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```bash
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_WEBHOOK_SECRET=...

EMAIL_USER=your-gmail-address
EMAIL_APP_PASSWORD=your-gmail-app-password
NEXT_PUBLIC_APP_URL=https://your-school-domain.example
NEXT_PUBLIC_TIMEZONE=Europe/Madrid
CRON_SECRET=replace-this
```

3. Apply the database schema:

```bash
npm run db:push
```

4. Start development:

```bash
npm run dev
```

## Verification

Run these before deployment:

```bash
npm run typecheck
npm run build
```

`npm run check` currently reports many pre-existing Biome formatting/class-order issues across the repo. Those are not the same as runtime or type failures.

## Email and Cron

The reminder endpoint is:

```text
/api/cron/session-reminders
```

It expects:

- `Authorization: Bearer <CRON_SECRET>`

Recommended schedule:

- Every 5 minutes

Email behavior:

- Students receive a reminder around 3 hours before a confirmed session
- Teachers receive a summary around 15 minutes before a session
- Booking confirmation, approval, rejection, and cancellation emails are sent when those events occur

## Operational Notes

- Students cannot change or cancel bookings inside the 15-minute lock window before the session starts.
- Teachers can only approve, reject, unbook, or mark attendance for sessions they manage. Admins can manage all sessions.
- Completed sessions with attendance or booking history are protected from deletion to preserve records.
- Equipment with booking or session history is protected from deletion to preserve inventory history.
- Actual equipment usage must be reported after a session ends and cannot exceed the originally booked amount.
