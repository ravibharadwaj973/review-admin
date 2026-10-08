# ReviewRankr Admin

The admin website for the people who run ReviewRankr: every business account, the on/off switch for access, plans and prices, discounts, bills, manual payments (UPI, cash, bank), Google connections, and admin users.

It is a separate Next.js app with its own repo and its own Vercel project. It has **no backend of its own** — it uses the same ReviewRankr API as the business app (`/api/admin/*`).

```
Admin website (this repo, e.g. admin.yourdomain.in)  ──/api/*──►  ReviewRankr API (EC2)  ◄──/api/*──  Business app (Vercel)
```

## Run locally

```bash
npm install
cp .env.example .env.local      # BACKEND_URL=http://localhost:4000
npm run dev                      # http://localhost:3001
```

Sign in with the admin login from the **backend** `.env`:

```
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=Choose-A-Strong-Password
ADMIN_NAME=Your Name
```

The API creates (or updates) this login every time it starts. Change `ADMIN_PASSWORD` and restart the API to change the password. More admins can be added under **Settings & admins**, or with `npm run create-admin -- email password` on the backend.

## Deploy on Vercel

1. Push this folder to its own GitHub repo.
2. Vercel → **Add New → Project** → import the repo (Framework: Next.js, root directory: the repo root).
3. **Environment Variables:** `BACKEND_URL` = your API address, e.g. `https://review.jharavi.in` (no slash at the end).
4. **Deploy.** Optional: add a domain such as `admin.yourdomain.in` under Settings → Domains.
5. Optional, on the server: add `ADMIN_URL=https://<your admin address>` to the backend `.env` and run `pm2 reload reviewrankr-api --update-env`.

## Pages

| Page | What you do there |
| --- | --- |
| Overview | Accounts, money collected, still to collect, overdue, payments to check, Google connections, new sign-ups |
| Accounts | Every business with status, plan, amount due, Google, reviews — and the access switch |
| Account | Plan, actual price, own price, discount, trial; bills (mark paid, edit, waive); payments (confirm / reject); Google sync / disconnect; notes; activity; open as business; reset password; delete |
| Payments & bills | Record a payment, check “I’ve paid” reports, all payments (CSV), all bills by status |
| Plans & prices | Create and edit plans |
| Google | Server setup checklist and every business’s connection |
| Settings & admins | Your UPI ID and bank details, trial length, due days, automatic pause, admin users, activity |

**Open as business** opens the business app in a new tab, signed in as that business for 2 hours, with a “Back to admin” bar.
