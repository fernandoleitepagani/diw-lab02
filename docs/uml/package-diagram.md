# Package Diagram (Logical View)

The diagram mirrors the real folder and module structure. Arrows represent
import or runtime dependencies, not user flow.

## Diagram

```mermaid
flowchart TB
    subgraph app["app (public/js)"]
        App["app.js<br/>composition root"]
        Routes["routes.js"]
    end

    subgraph router["router (public/js)"]
        Router["router.js"]
    end

    subgraph ui["ui (public/js/ui)"]
        Layout["layout.js"]
        Components["components.js"]
        Views["views/<br/>16 screen modules"]
    end

    subgraph domain["domain (public/js/domain)"]
        Cpf["cpf.js"]
        Validation["validation.js"]
        State["request-state.js"]
        Permissions["permissions.js"]
        Pricing["pricing.js"]
    end

    subgraph data["data (public/js/data)"]
        Repos["users.js · clients.js · cars.js<br/>requests.js · contracts.js<br/>credit-contracts.js"]
    end

    subgraph api["api (public/js)"]
        ApiClient["api.js"]
    end

    subgraph shared["shared (public/js)"]
        Session["session.js"]
        Format["format.js"]
    end

    subgraph assets["public/"]
        Index["index.html"]
        Css["css/app.css"]
        Vendor["vendor/bootstrap/"]
    end

    subgraph scripts["scripts/"]
        Ensure["ensure-db.mjs"]
    end

    subgraph tests["tests/"]
        TestCpf["cpf.test.js"]
        TestValidation["validation.test.js"]
        TestState["request-state.test.js"]
        TestPermissions["permissions.test.js"]
        TestPricing["pricing.test.js"]
    end

    subgraph docs["docs/"]
        Adr["adr/<br/>4 ADRs"]
        Uml["uml/<br/>4 diagrams"]
        Stories["user-stories.md"]
    end

    Package["package.json"]
    Seed["db.seed.json"]
    Db["db.json (gitignored)"]
    JsonServer["JSON Server 0.17.4"]

    Index --> App
    Index --> Css
    Index --> Vendor
    App --> Routes
    App --> Router
    App --> Layout
    App --> Session
    Routes --> Views
    Layout --> Format
    Layout --> Session
    Views --> Components
    Views --> Format
    Views --> Session
    Views --> Router
    Views --> Cpf
    Views --> Validation
    Views --> State
    Views --> Permissions
    Views --> Pricing
    Views --> Repos
    Repos --> ApiClient
    Repos --> Cpf
    Repos --> Validation
    Repos --> State
    ApiClient --> JsonServer
    JsonServer --> Db
    JsonServer --> Index
    JsonServer --> Css
    JsonServer --> Vendor
    Package --> Ensure
    Ensure --> Seed
    Ensure --> Db
    TestCpf --> Cpf
    TestValidation --> Validation
    TestState --> State
    TestPermissions --> Permissions
    TestPricing --> Pricing
    Uml -.->|"documents"| App
```

## Packages and responsibilities

| Package / folder | Files | Responsibility |
| --- | --- | --- |
| `app` | `app.js`, `routes.js` | SPA composition: mounts the layout, starts the router, and declares the route table with role guards. |
| `router` | `router.js` | Parses the hash, matches `:params`, applies guards, and calls `render(container, context)`. |
| `ui` | `ui/layout.js`, `ui/components.js`, `ui/views/*.js` | Presentation: navbar, toasts, forms, lists, and detail screens. No workflow rules are computed inline. |
| `domain` | `cpf.js`, `validation.js`, `request-state.js`, `permissions.js`, `pricing.js` | Pure rules: CPF, entity validation, state machine, permissions/ownership, and pricing. No DOM, `fetch`, or `localStorage`. |
| `data` | `users.js`, `clients.js`, `cars.js`, `requests.js`, `contracts.js`, `credit-contracts.js` | Repositories: collection operations, reference checks, and multi-collection workflows. |
| `api` | `api.js` | Thin HTTP client over `fetch`; centralizes URLs, `ApiError`, and body parsing. |
| `shared` | `session.js`, `format.js` | Password-free session in `localStorage` and PT-BR formatting/HTML escaping. |
| `public` | `index.html`, `css/app.css`, `vendor/bootstrap/` | HTML shell, small overrides, and vendored Bootstrap 5.3.3. |
| `scripts` | `ensure-db.mjs` | Creates or restores `db.json` from `db.seed.json`. |
| `tests` | five `*.test.js` files | Unit tests with `node:test` for the domain modules. |
| `docs` | `adr/`, `uml/`, `user-stories.md` | Architecture decisions, diagrams, and user stories. |

## Dependency rules

- `domain` imports nothing from `ui`, `data`, `api`, or `session`.
- `data` may import `api` and `domain`; it never imports `ui`.
- `ui` imports `domain`, `data`, `api`, `shared`, and `router`.
- `app` is the only composition root; no module imports `app.js`.
- `tests` import only `domain` (and the modules it uses).
