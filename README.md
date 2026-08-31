# Wiithub

Wiithub publishes small static websites under memorable IDs and serves them through a page that works in the Nintendo Wii Internet Channel.

## Product surfaces

- `/wiithub/` — Wii-compatible HTML 4.01 runner. It uses an ordinary HTML form and no JavaScript.
- `/wiithub/studio.html` — modern React Studio for selecting, reviewing, and publishing site files.
- `/api/wiithub/run/<id>/` — public URL for a published site.

The included sample site has the ID `welcome`.

## Site limits

- IDs use 3–32 lowercase letters, numbers, and hyphens.
- IDs are permanent and cannot be reused.
- Every site needs a root `index.html`.
- Up to 25 files, 512 KB per file, and 2 MB total.
- Static HTML, CSS, JavaScript, JSON, text, XML, SVG, common web images, fonts, MP3, and WAV are supported.
- Server-side code and build systems are not executed.
- A network address may publish up to five sites per hour.

## Development

From the repository root:

```sh
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/wiithub run dev
```

The Replit artifact workflow supplies `PORT` and `BASE_PATH`. For a local production build:

```sh
PORT=22043 BASE_PATH=/wiithub/ pnpm --filter @workspace/wiithub run build
pnpm --filter @workspace/api-server run build
```

The API server requires `DATABASE_URL`. Use a PostgreSQL database and push the included Drizzle schema before starting the app.

## GitHub

The downloadable archive preserves the pnpm workspace structure and generated API client. Extract it, create a Git repository, commit the files, and push them to GitHub. GitHub Pages alone cannot host Wiithub because publishing requires the Express API and PostgreSQL database; deploy the repository on a full-stack host such as Replit.