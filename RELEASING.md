# Releasing

Publishing to npm runs on GitHub Actions via npm's **Trusted Publishing**
(OIDC) — no `NPM_TOKEN` secret exists anywhere in this repo or org.

```
push tag / GitHub Release
        │
        ▼
GitHub Actions (.github/workflows/publish.yml)
        │
        ▼            requests a short-lived id-token for this exact
       OIDC   ─────►  workflow run (repo + workflow file + ref)
        │
        ▼            npm checks the id-token's claims against the
npm Trusted Publishing  Trusted Publisher entry configured for the package
        │
        ▼
    npm publish
```

## One-time setup (npmjs.com, not in this repo)

On the [`@cassius0924/dsh-usage-dashboard` package settings page](https://www.npmjs.com/package/@cassius0924/dsh-usage-dashboard/access) → **Trusted Publisher** → add a GitHub Actions publisher with exactly:

| Field | Value |
|---|---|
| Organization or user | `Cassius0924` |
| Repository | `dsh-usage-dashboard` |
| Workflow filename | `publish.yml` |
| Environment name | *(leave blank — not used)* |

This is a one-time step done by whoever owns the npm package; it cannot be
done from the repo (no CLI/API for it as of writing). Until it's set up,
the workflow's `npm publish` step will fail with an auth error even though
everything else in the run succeeds.

## Cutting a release

1. Bump `version` in `package.json` (this is the single source of truth the
   workflow checks the release tag against).
2. Tag and publish a GitHub Release from that commit, e.g.:
   ```sh
   gh release create v0.4.0 --generate-notes
   ```
   (`gh release create` creates the tag too if it doesn't already exist.)
3. The `release: published` event fires `.github/workflows/publish.yml`,
   which builds, typechecks, verifies the tag matches `package.json`
   `version`, and runs `npm publish --provenance --access public`.

A pre-release (`gh release create ... --prerelease`) still fires
`release: published`, so mark drafts as drafts, not pre-releases, if a
release isn't ready to publish yet.
