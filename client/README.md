# Kredex

**Know what you're owed. Know your business.**

Kredex is a persistent-memory AI financial operating system for small and micro
businesses in emerging markets — manage inventory, customer debts, payroll, and
invoices just by talking, in English, Nigerian Pidgin, Yoruba, or Hausa.

This repository is the **web app**: a marketing landing page and an operator
dashboard.

## Stack

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/)
- [Tailwind CSS v3](https://tailwindcss.com/) (class-based dark mode)
- [react-router-dom](https://reactrouter.com/) for routing
- [@iconify/react](https://iconify.design/docs/icon-components/react/) (Solar icon set)

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Routes

| Path | Page |
|---|---|
| `/` | Landing page (hero, features bento, stats, waitlist) |
| `/dashboard` | Operator dashboard — owed/revenue/health cards, revenue chart, activity, reminders |
| `/dashboard/chat` · `/invoices` · `/settings` | Placeholder pages (coming soon) |

The dashboard supports light/dark mode via the toggle at the bottom of the
sidebar (persisted to `localStorage`; a `?theme=dark|light` URL param overrides it).

## Structure

```
src/
  App.jsx                  # Router
  Landing.jsx              # Landing page shell + background effects
  components/
    Navbar / Hero / Features / Stats / Waitlist / Footer
    KredexMark.jsx         # Logo mark
    dashboard/
      DashboardLayout · Sidebar · Topbar · ThemeToggle
      StatCards · RevenueChart · RecentActivity · NeedsAttention · LowStock
      DashboardPage · StubPage
      data.js              # Mock data
```

## Notes

- Dashboard data is currently **mock** (`src/components/dashboard/data.js`) — no
  backend wired yet.
- The landing hero uses a static screenshot of the dark dashboard
  (`src/assets/kredex-dashboard-dark.png`); re-capture it when the dashboard UI changes.
