# 0004 — Vendored Bootstrap 5.3

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

The interface needs a responsive layout, forms, tables, modals, toasts, and
status badges. The assignment must be demonstrable in a classroom with
unreliable or absent internet access, and the project should not depend on a
CDN at runtime.

## Decision

Vendor Bootstrap 5.3 CSS and the bundle JavaScript under
`public/vendor/bootstrap/` and reference them with relative paths from
`public/index.html`. Custom styling is limited to a small `public/css/app.css`
override file; the project does not compile or fork Bootstrap.

## Consequences

- The app renders fully offline once the repository is cloned.
- Bootstrap assets are committed, so the repository is larger and the version
  must be updated manually.
- No Sass pipeline or build step is needed.
- UI markup follows Bootstrap conventions, which keeps views consistent and
  reduces custom CSS.

## Alternatives considered

- **Bootstrap from a CDN:** fails offline and makes the demo dependent on a
  third party.
- **Tailwind or another utility framework:** requires a build step and a
  different vendoring story.
- **Hand-written CSS only:** slower to produce accessible, responsive forms,
  tables, and modals within the lab schedule.
