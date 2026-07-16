# Unified repository and deployment plan

## Goal

Serve the proposal and the working DemoThemis MVP from one Git repository, one
Netlify project, and one hostname: `https://demothemis.netlify.app`.

The proposal keeps its existing public URLs. The MVP becomes part of the same
deployment instead of sending reviewers to Vercel.

## Final route layout

| Route | Purpose |
| --- | --- |
| `/` | Proposal homepage |
| `/demothemis.html` and the other existing `.html` routes | Proposal chapters |
| `/demothemis-mvp.html` | Plain-language MVP gateway |
| `/app` | Full MVP landing and evidence dashboard |
| `/sandbox` | Interactive browser simulation |
| `/home`, `/case/:id`, `/onboard`, `/about` | Live court application |
| `/api/*` | Authentication, World ID, and payment server endpoints |

## Architecture

The MVP must remain a server-capable Next.js application. It uses NextAuth,
middleware, and five API routes, so a static export would silently remove working
features. Netlify therefore builds `DemoThemisMVP/web` with its current Next.js
runtime and OpenNext adapter.

The proposal remains static HTML. Before each Next.js build,
`tools/prepare-unified-site.js` runs the existing proposal builder and copies its
output into the Next.js `public` directory. The proposal's `index.html` is renamed
to `proposal-home.html` to avoid colliding with the MVP's Next.js root route;
Netlify internally rewrites `/` to that file.

The MVP source becomes ordinary files under `DemoThemisMVP/`, not a submodule.
This prevents a missing parent `.gitmodules` file from blocking deployment and
lets one commit update the proposal and application together. The large Foundry
libraries remain submodules because they are third-party dependencies, not
DemoThemis source.

## Implementation sequence

1. Remove the `DemoThemisMVP` gitlink from the parent index without deleting the
   local directory.
2. Add the local MVP source as normal tracked files, preserving its 27 local
   changes that are newer than the separate repository's current commit.
3. Move the two Foundry submodule declarations to the repository-root
   `.gitmodules`, with their paths prefixed by `DemoThemisMVP/`.
4. Keep `.env*`, private keys, dependencies, build output, logs, and Vercel local
   state ignored.
5. Add the proposal-to-Next preparation script and switch `netlify.toml` from the
   static `dist` build to the Next.js application.
6. Change every proposal MVP link from `demo-themis-mvp.vercel.app` to the
   equivalent same-origin route.
7. Build and test the proposal and MVP locally, including route, secret, and Git
   index checks.
8. Push the unified commit, configure the required Netlify environment variables,
   and verify both static and server-rendered routes on the production hostname.
9. Update the World Developer Portal application URL to the Netlify hostname only
   after production verification, then retain the Vercel deployment briefly as a
   rollback target.

## Netlify environment variables

The deployment needs the same application variables as the working Vercel MVP:

- `AUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `AUTH_URL=https://demothemis.netlify.app`
- `HMAC_SECRET_KEY`
- `NEXT_PUBLIC_APP_ID`
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_SHOW_DEV=false`
- `RP_SIGNING_KEY`
- `RP_ID`

`DEV_PRIVATE_KEY` must not be configured in production while the development
route is disabled. Contract deployment keys and RPC secrets are not needed by the
web deployment.

## Verification and rollback

A successful cutover requires all of the following:

- Netlify checks out the repository and the two Foundry submodules.
- The proposal build and smoke test pass.
- The Next.js production build passes with no missing environment variables.
- `/`, a proposal chapter, `/app`, `/sandbox`, `/home`, and an `/api/*` endpoint
  respond from `demothemis.netlify.app`.
- The proposal contains no live links to the Vercel MVP.
- No ignored environment file, key, build directory, or dependency directory is
  tracked.

If the unified deploy fails, Netlify continues serving the last successful
proposal deployment and the current Vercel MVP remains available. Rollback is a
Netlify deploy restore; no contract state changes are involved.
