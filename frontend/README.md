# SyncScape — Frontend

SyncScape is a roommate matcher. People swipe on potential roommates based on lifestyle and personality, and when two people like each other they become a group. The group then browses house listings together and likes homes as one. Property owners see which groups liked their listing and can accept them.

This folder is the web frontend (React + TypeScript + Vite). The backend lives in the same repository on the backend branches, and the frontend needs it running for login, listings and matches to work for real. Until then, the forms validate input and show a confirmation, but nothing is saved.

## What's built so far

| Route | Page |
| ----- | ---- |
| `/login` (also `/`) | Log in |
| `/signup` | Create an account (name, email, password) |
| `/forgot-password` | Request a password reset link |

Any other URL redirects to `/login`.

The auth pages are responsive: full-screen form on phones, a centered card on tablets, and a split screen with a brand panel on desktop.

## Tech stack

| Purpose      | Library                               |
| ------------ | ------------------------------------- |
| Build tool   | Vite                                  |
| UI           | React 19 + TypeScript                 |
| Styling      | Tailwind CSS v4 + shadcn/ui           |
| Font         | Geist (bundled via `@fontsource`)     |
| Routing      | React Router                          |
| Server state | TanStack Query                        |
| Client state | Zustand                               |
| Validation   | Zod                                   |
| Forms        | React Hook Form + @hookform/resolvers |
| HTTP         | Axios                                 |
| Toasts       | Sonner                                |
| Testing      | Vitest + React Testing Library        |
| Linting      | oxlint                                |

Exact versions are in [package.json](./package.json).

## Prerequisites

You need **Node.js 20.19+ or 22.12+** and **Git**.

**macOS** (with [Homebrew](https://brew.sh)):

```bash
brew install node git
```

**Windows** (PowerShell):

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Or use the LTS installer from <https://nodejs.org>. Reopen the terminal afterwards and check with `node -v` and `git --version`.

## Getting started

```bash
git clone <repo-url>
cd SyncScape/frontend
npm install
npm run dev
```

Then open <http://localhost:5173>. The same commands work in Terminal on macOS and in PowerShell, Command Prompt or Git Bash on Windows.

Use `npm ci` instead of `npm install` to get the exact versions from `package-lock.json` without changing it.

## Scripts

```bash
npm run dev        # dev server on http://localhost:5173
npm run build      # type-check and build into dist/
npm run preview    # serve the production build
npm run lint       # lint with oxlint
```

## Project structure

```
frontend/
├── index.html
├── vite.config.ts          # Vite + Tailwind plugin + @/ alias
├── components.json         # shadcn/ui config
└── src/
    ├── main.tsx            # entry point, wraps App in BrowserRouter
    ├── App.tsx             # routes + Toaster
    ├── index.css           # Tailwind, theme colours, font
    ├── pages/              # one component per route
    ├── components/
    │   ├── AuthLayout.tsx  # shared layout for login / sign up / reset
    │   └── ui/             # shadcn components
    ├── services/           # API calls (ApiService base class + one service per resource)
    ├── context/            # global state such as the logged-in user
    └── lib/utils.ts        # cn() helper
```

Imports can use the `@/` alias, for example `import { Button } from "@/components/ui/button"`.

There's no `tailwind.config.js` or `postcss.config.js`: Tailwind v4 is set up through the Vite plugin and the theme in `src/index.css`.

## Adding shadcn/ui components

```bash
npx shadcn@latest add dialog card
```

Components are copied into `src/components/ui/`.

## Troubleshooting

- **Windows: "running scripts is disabled on this system"** — run once in PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- **Strange install errors** — delete `node_modules` and run `npm install` again
- **Port 5173 is busy** — `npm run dev -- --port 3000`
