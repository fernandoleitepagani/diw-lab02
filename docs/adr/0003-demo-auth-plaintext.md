# 0003 — Demo authentication with plain-text passwords

- **Status:** Accepted for the lab; rejected for production
- **Date:** 2026-11-06

## Context

The assignment is a front-end lab evaluated on interface behavior and domain
modeling. It has no backend framework, no database server, and no secure secret
storage. The professor needs to log in with documented demo accounts without a
registration or email-verification infrastructure.

## Decision

Store demo users, including their passwords, in `db.seed.json` and compare the
submitted password with the stored value on the client. All demo accounts use
the password `123456`. After a successful login the app stores only non-secret
session fields (`id`, `name`, `email`, `role`, `agentType`, `clientId`) in
`localStorage`; it never stores the password.

**Plain-text passwords are acceptable only for this demonstration. They are
unacceptable in production.** A real deployment must hash passwords with a slow
password-hashing function (for example Argon2 or bcrypt), verify credentials on
a trusted server, use HTTPS, rate-limit login attempts, and keep authorization
decisions server-side. The client-side checks in this lab are not a security
boundary.

## Consequences

- Demo credentials are readable in the repository, which is intentional for
  grading and for the presentation.
- Anyone who can read `db.json` can impersonate any demo user; this is
  understood and limited to local use.
- No password reset, email verification, session expiry, or revocation exists.
- The authentication code is deliberately small so the lab focus stays on the
  rental workflow.

## Alternatives considered

- **Hashing in the browser:** still ships the verifier and offers no real
  protection; it would only obscure the demo credentials.
- **A hosted auth provider:** adds a dependency, network requirement, and setup
  steps that the assignment does not ask for.
- **Skipping authentication:** would prevent demonstrating role-specific flows
  and ownership rules.
