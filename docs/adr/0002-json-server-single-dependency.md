# 0002 — JSON Server as the only dependency

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

The assignment requires persistent collections for users, clients, cars, rental
requests, contracts, and credit contracts, but it does not require a real
backend. The project should stay easy to install and run on a student machine
and should keep a clean separation between the domain layer and persistence.

## Decision

Use `json-server@0.17.4` as the only development dependency. It serves the
`public/` folder statically, exposes every top-level key of `db.json` as a REST
collection, and supports the HTTP methods used by the `api.js` wrapper. The
authoritative seed lives in `db.seed.json`; `scripts/ensure-db.mjs` copies it to
`db.json` on first start, and `db.json` is gitignored.

## Consequences

- Installation is one package and one lockfile.
- The data layer can be replaced later without changing domain modules, because
  all network access is confined to `public/js/api.js`.
- JSON Server has no authentication, authorization, validation, or transactional
  guarantees. Those rules live in the domain layer and are enforced by the UI.
- The data store is a single JSON file, not suitable for concurrent writers or
  production use.

## Alternatives considered

- **A real backend (Express + database):** out of scope and much slower to set up.
- **Browser-only localStorage:** cannot model multiple collections with a shared
  REST-like interface, and data would not be inspectable in one file.
- **Mock Service Worker:** adds a dependency and runtime complexity without a
  persistence file the professor can open.
