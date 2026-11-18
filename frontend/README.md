# Doctor Tracker: frontend

Next.js 16 app (App Router, shadcn/ui, TanStack Query). Setup, architecture and
screenshots are in the [project README](../README.md).

```bash
npm install
npm run dev      # http://localhost:3000, expects the API on http://localhost:5000
npm run build    # production build (standalone output, used by the Dockerfile)
npm run lint
```

Settings: copy [`.env.example`](.env.example) to `.env.local` (optional, defaults work locally).
