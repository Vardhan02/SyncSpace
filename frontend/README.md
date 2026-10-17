About
SyncScape is a platform for finding student accommodation — it connects house owners listing properties with customers (students) looking for a place to stay, using a matching engine to rank listings against each customer's preferences.

Features

* Users access the platform via token-based login
* House owners can create listings by submitting:
   * title
   * description
   * price per month
   * amenities (double bed, study desk, wifi, etc.)
   * photos
* Customers fill in a preferences form (budget, distance, lifestyle) and get a ranked feed of matching listings

How it works
The project is divided into two parts:

1. Backend (separate repo — Django REST API)
2. Frontend (this repo)

This repository covers only the Frontend. The Frontend needs the Backend running to actually work (login, listings, matches all come from the API).

Pre-requisites
Before you begin, you'll need the following installed on your machine: [Git](https://git-scm.com), [Node.js](https://nodejs.org/en/) (20.19+ or 22.12+). It's also worth having an editor like [VSCode](https://code.visualstudio.com/).

Running the web application (Frontend)

```
# Clone this repository
$ git clone <repo-url>

# Access the project folder in your terminal
$ cd SyncScape/frontend

# Install the dependencies
$ npm install

# Run the application in development mode
$ npm run dev

# The application will open on port 5173 - go to http://localhost:5173
```

Tech Stack
The following tools were used in the construction of the project:
Platform ([React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/), via [Vite](https://vitejs.dev/))

* [React Router Dom](https://github.com/remix-run/react-router)
* [Axios](https://github.com/axios/axios)
* [TanStack Query](https://tanstack.com/query/latest)
* [Zustand](https://github.com/pmndrs/zustand)
* [Zod](https://zod.dev/)
* [React Hook Form](https://react-hook-form.com/) + [@hookform/resolvers](https://github.com/react-hook-form/resolvers)
* [Tailwind CSS v4](https://tailwindcss.com/)
* [shadcn/ui](https://ui.shadcn.com/)
* [Sonner](https://sonner.emilkowal.ski/)
* [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

See the file [package.json](./package.json) for exact versions.

Utils

* Backend API: Django REST API (separate repo)
* Editor: [Visual Studio Code](https://code.visualstudio.com/)
* Icons: [Lucide](https://lucide.dev/) (bundled with shadcn/ui components)
* Linting: [oxlint](https://oxc.rs/docs/guide/usage/linter.html)# SyncScape — Frontend

React + TypeScript + Vite app.

## Tech stack

| Purpose            | Library                                         |
| ------------------ | ----------------------------------------------- |
| Build tool         | Vite                                            |
| UI                 | React 19 + TypeScript                           |
| Styling            | Tailwind CSS v4 + shadcn/ui                     |
| Routing            | React Router                                    |
| Server state       | TanStack Query (+ Devtools)                     |
| Client state       | Zustand                                         |
| Validation         | Zod                                             |
| Forms              | React Hook Form + @hookform/resolvers           |
| HTTP               | Axios                                           |
| Toasts             | Sonner                                          |
| Testing            | Vitest + React Testing Library + jsdom          |
| Linting            | oxlint                                          |

---

## 1. Prerequisites (one time per machine)

You need **Node.js 20.19+ or 22.12+** (LTS recommended) and **Git**.

### macOS

Using [Homebrew](https://brew.sh):

```bash
brew install node git
```

### Windows

Using **PowerShell** (winget is built in on Windows 10/11):

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Or download the LTS installer from <https://nodejs.org>. Close and reopen your terminal after installing.

### Check it worked (both OS)

```bash
node -v
npm -v
git --version
```

---

## 2. Install project dependencies

All dependencies are already listed in `package.json` / `package-lock.json`, so you only need **one command**. The same commands work on macOS (Terminal) and Windows (PowerShell / Command Prompt / Git Bash).

```bash
git clone <repo-url>
cd SyncScape/frontend
npm install
```

> Use `npm ci` instead of `npm install` if you want the exact versions from `package-lock.json` without modifying it (recommended for CI).

---

## 3. Run the app

```bash
npm run dev        # start dev server → http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build
npm run lint       # lint with oxlint
```

---

## 4. Adding shadcn/ui components

shadcn is already initialised (`components.json`). Add components as needed — they are copied into `src/components/ui/`:

```bash
npx shadcn@latest add button input form card dialog sonner
```

---

## 5. Reference: how the dependencies were originally installed

You do **not** need to run these — `npm install` already does it. They are here for reference / if you ever need to recreate the setup.

```bash
# Project scaffold
npm create vite@latest frontend -- --template react-ts

# Core libraries
npm install react-router-dom @tanstack/react-query zustand zod react-hook-form @hookform/resolvers axios sonner

# Tailwind CSS v4 (Vite plugin)
npm install tailwindcss @tailwindcss/vite

# Dev tools + testing
npm install -D @tanstack/react-query-devtools @types/node
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event

# shadcn/ui (requires the @/ alias in tsconfig + vite.config and Tailwind set up first)
npx shadcn@latest init -d
```

---

## Project structure

```
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts              # Vite + Tailwind v4 plugin + @/ alias
├── components.json             # shadcn/ui config
├── index.html
├── Dockerfile
│
└── src/
    ├── main.tsx                # app entry point
    ├── App.tsx                 # routes + AuthProvider
    ├── index.css               # Tailwind import + shadcn theme
    │
    ├── services/               # OOP layer — all API calls live here
    │   ├── ApiService.ts       # base class (axios instance + auth header)
    │   ├── AuthService.ts      # extends ApiService
    │   ├── ListingService.ts   # extends ApiService
    │   └── MatchService.ts     # extends ApiService
    │
    ├── context/
    │   └── AuthContext.tsx     # global login state (Context API)
    │
    ├── pages/                  # one component per route
    │   ├── Login.tsx
    │   ├── Register.tsx
    │   ├── CreateListing.tsx
    │   └── MatchFeed.tsx
    │
    ├── components/
    │   ├── ListingCard.tsx     # reusable piece used inside MatchFeed
    │   └── ui/                 # shadcn components (added via `npx shadcn add`)
    │
    └── lib/
        └── utils.ts            # shadcn `cn()` helper
```

> **No `tailwind.config.js` / `postcss.config.js`:** this project uses Tailwind CSS v4, which is configured through the `@tailwindcss/vite` plugin in `vite.config.ts` and the theme in `src/index.css`. Those two files are only needed for Tailwind v3.

Imports can use the `@/` alias, e.g. `import { Button } from "@/components/ui/button"`.

---

## Troubleshooting

- **Windows: `npm` "running scripts is disabled on this system"** — run once in PowerShell:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```
- **Weird install errors** — delete `node_modules` and reinstall:
  - macOS: `rm -rf node_modules && npm install`
  - Windows (PowerShell): `Remove-Item -Recurse -Force node_modules; npm install`
- **Port 5173 already in use** — `npm run dev -- --port 3000`
