# Secrets Setup Guide

## Summary

Good news: the Dune Browser Game workflows require **no manually configured secrets**.

All workflows use GitHub's automatically-provided tokens:

| Workflow | Token used | Auto-provided? |
|----------|-----------|----------------|
| CI (`ci.yml`) | `GITHUB_TOKEN` | ✅ Yes |
| Release (`release.yml`) | `GITHUB_TOKEN` | ✅ Yes |
| GitHub Pages (`deploy-pages.yml`) | OIDC `id-token` | ✅ Yes |
| Container Registry (`publish-container.yml`) | `GITHUB_TOKEN` | ✅ Yes |

## One-time Setup Steps

These are configuration steps (not secrets) you need to do once after pushing the repo to GitHub:

### 1. Enable GitHub Pages
1. Go to the repo on GitHub → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Save

### 2. Enable GitHub Container Registry
The container workflow publishes to `ghcr.io/cocodedk/dune-browser-game`. This works automatically with `GITHUB_TOKEN` — no additional setup needed.

After the first publish, the package may be private by default. To make it public:
1. Go to https://github.com/cocodedk?tab=packages
2. Find `dune-browser-game` → **Package settings**
3. Set visibility to **Public**

### 3. Run Branch Protection Setup
After the first CI run completes successfully on GitHub:
```bash
./scripts/setup-repo.sh
```
This configures squash-only merges, branch protection, and CODEOWNERS.

## If You Add Secrets in the Future

If you later add paid features, analytics, or API integrations, add secrets at:
**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Reference them in workflows as `${{ secrets.MY_SECRET_NAME }}`.
