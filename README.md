# idlm.github.io

Personal site &amp; blog (Hexo)

## Deploy

Push to `main` triggers GitHub Actions: build with Node 22 → `hexo deploy` to `master`.

**Required secret:** `DEPLOY_KEY` (SSH ed25519 private key, write access to this repo).
Set it at https://github.com/idlm/idlm.github.io/settings/secrets/actions/new

## Local aliases

- `ghs [msg]` — one-shot: add, commit, push `main` (triggers deploy)
- `gs [msg]` — one-shot: add, commit, push (any repo)
