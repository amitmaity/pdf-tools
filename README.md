# PDF Tools

Free, private PDF utilities that run entirely in your browser — split, merge, and compress PDFs without uploading files to a server.

**Live site:** [https://amitmaity.github.io/pdf-tools/](https://amitmaity.github.io/pdf-tools/)

## Features

- **Split PDF** — Select pages via thumbnails or page ranges (`1-3, 5, 7-9`). Export as one PDF or one file per page (ZIP).
- **Merge PDF** — Combine multiple PDFs; drag to reorder before merging.
- **Compress PDF** — Re-encode embedded images at adjustable JPEG quality to reduce file size.

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS v4
- [pdf-lib](https://pdf-lib.js.org/) — PDF read/write
- [pdf.js](https://mozilla.github.io/pdf.js/) — thumbnails & rendering
- [JSZip](https://stuk.github.io/jszip/) — multi-file downloads

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/pdf-tools/](http://localhost:5173/pdf-tools/) (note the base path).

```bash
npm run build    # production build to dist/
npm run preview  # preview production build locally
```

## Deploy to GitHub Pages

This repo includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) to build and deploy on every push to `main`.

### One-time setup

1. Create a GitHub repo named `pdf-tools` under [amitmaity](https://github.com/amitmaity).
2. Push this project to the `main` branch.
3. In the repo: **Settings → Pages → Build and deployment → Source** → select **GitHub Actions**.
4. After the workflow completes, the site is available at `https://amitmaity.github.io/pdf-tools/`.

### Manual deploy trigger

Actions → **Deploy** → **Run workflow**.

## Privacy

All processing happens client-side in your browser. PDFs are never sent to any server.

## License

MIT
