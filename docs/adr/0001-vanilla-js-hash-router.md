# 0001 — Vanilla JavaScript with a hash router

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

The course assignment asks for a client-side web interface with several screens,
role-based navigation, and no server-side application code. The project must run
from a static folder served by JSON Server, with no build step, so the professor
can inspect and run it with a short command sequence.

## Decision

Build the SPA with plain ES modules and a small hash-based router. Every route
is declared in `public/js/routes.js`; navigation uses URLs such as `#/requests`
and `#/requests/:id`, which the browser handles without any server rewrite rule.
Views export a `render(container, context)` function and receive route params,
query values, and the current session.

## Consequences

- The app works from any static host and from `file://`-style hash navigation.
- No bundler, framework runtime, or compilation step is required.
- Routing, rendering, and DOM updates are written by hand; there is more
  boilerplate than a framework would produce.
- Deep links always contain `#/`, which is less clean than history-based URLs.

## Alternatives considered

- **History API routing:** requires server rewrite rules, which JSON Server does
  not provide out of the box.
- **A framework (React, Vue):** adds a build step and dependencies that the
  assignment does not require.
- **Multiple HTML pages:** duplicates layout and navigation and makes shared
  session state harder to maintain.
