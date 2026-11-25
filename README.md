# Speakwell

## Development

Use Node.js 24 and Corepack. From the repository root, install the pinned dependencies and start Next.js.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

## GitHub Pages

In the GitHub repository, open **Settings → Pages** and select **GitHub Actions** under **Build and deployment → Source**. Once the workflow is on `main`, pushes to `main` deploy automatically. To trigger a deployment manually, open **Actions → Deploy to GitHub Pages → Run workflow**.

The workflow reads the Pages base path from GitHub, builds a static export, and publishes the `out/` directory. The deployed URL appears in the workflow's deployment summary.

To build the same export locally for the default repository URL, run the following from the repository root.

```sh
NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH=/AI-presenting-interviews-coach corepack pnpm build
```
