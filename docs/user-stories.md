# User Stories

Car rental system — DIW Lab 02. Stories are grouped by actor. Each story has
verifiable acceptance criteria tied to the application and the domain tests.

`US-xx` identifiers are stable. The coverage map at the end links each PDF
requirement and implemented flow to one or more stories.

---

## Visitor (unauthenticated)

### US-01 — Register a client account

**As a** visitor, **I want** to create my account and client record, **so that**
I can request rentals.

**Acceptance criteria**

- [ ] `#/register` asks for name, e-mail, password and confirmation, RG, CPF,
  address, profession, and 0–3 employers (company + income).
- [ ] An invalid or already registered e-mail (case-insensitive comparison)
  blocks registration and shows a PT-BR message.
- [ ] The password must be at least 6 characters and match the confirmation.
- [ ] CPF goes through `isValidCpf`, is formatted on blur, and repeated-digit or
  wrong-check-digit values are rejected.
- [ ] More than three employers, an empty employer name, or a negative income is
  rejected by `validateClient`; a blank income is treated as invalid.
- [ ] Success writes a `users` record with `role: "client"`, `clientId`,
  `agentType: null` and a `clients` record with the matching `userId`, with no
  null foreign keys.
- [ ] The account is logged in automatically, a toast is shown, and the app
  navigates to `#/`.
- [ ] Write failures keep the form filled and show a clear message; no password
  is ever displayed.

### US-02 — Log in

**As a** registered user, **I want** to authenticate with e-mail and password,
**so that** I can access the areas allowed for my role.

**Acceptance criteria**

- [ ] The five seeded accounts log in with password `123456`; e-mail comparison
  ignores case and trims whitespace.
- [ ] Unknown e-mail, wrong password, and unknown role all produce the generic
  message `"E-mail ou senha inválidos."` and create no session.
- [ ] The button shows a loading state (`"Entrando..."`) and is disabled during
  the request.
- [ ] Success stores the session in `localStorage`, shows a welcome toast, and
  navigates to `#/`.
- [ ] Authenticated users who open `#/login` or `#/register` are redirected to
  `#/`.
- [ ] The password is never rendered in the UI nor copied into the session.

### US-03 — Log out

**As an** authenticated user, **I want** to end my session, **so that** my
account is protected on a shared computer.

**Acceptance criteria**

- [ ] The navbar `Sair` button removes the `diw-lab02.session` key from
  `localStorage`.
- [ ] The user is sent to `#/login`; the navbar shows `Entrar` and `Cadastrar`
  again.
- [ ] Protected routes stop opening after logout, even if the URL is edited
  manually.
- [ ] Logging out from the login screen itself triggers a fresh render without
  leaving stale content.

### US-04 — Protect routes from visitors

**As a** visitor, **I must not** access internal data without logging in, **so
that** the system is used only after prior registration.

**Acceptance criteria**

- [ ] Opening `#/`, `#/clients`, `#/cars`, `#/requests`, `#/contracts`, or
  `#/credit-contracts` without a session redirects to `#/login`.
- [ ] `#/login` and `#/register` are the only public routes; an unknown route
  renders the 404 view.
- [ ] The router enforces `roles` before rendering; a view called directly also
  shows a PT-BR warning when the role is not allowed.
- [ ] A valid session survives reloads, and a corrupt `localStorage` entry is
  treated as no session.

### US-05 — See role-appropriate navigation

**As an** authenticated user, **I want** to see only my role's shortcuts, **so
that** I do not waste time on irrelevant screens.

**Acceptance criteria**

- [ ] A client sees `Dashboard`, `Meus pedidos`, `Carros`, and `Meu perfil`.
- [ ] A rental company agent sees `Dashboard`, `Clientes`, `Carros`, `Pedidos`,
  and `Contratos`.
- [ ] A bank agent sees `Dashboard`, `Clientes`, `Pedidos`, `Contratos`, and
  `Créditos`.
- [ ] The navbar shows name, role, and agent type; a visitor sees `Entrar` and
  `Cadastrar`.
- [ ] The dashboard shows action cards consistent with the role.

---

## Cliente

### US-06 — View the client dashboard

**As a** client, **I want** to see a greeting and my shortcuts, **so that** I
can start a rental quickly.

**Acceptance criteria**

- [ ] The dashboard shows `Olá, <name>!` and the `Cliente` badge.
- [ ] Cards link to `Novo pedido`, `Meus pedidos`, `Carros disponíveis`, and
  `Meu perfil`.
- [ ] The screen does not query requests or contracts until the user asks.
- [ ] Without a session, the dashboard asks the visitor to log in instead of
  failing.

### US-07 — Browse only available cars

**As a** client, **I want** to see the available fleet as cards, **so that** I
can choose a vehicle to rent.

**Acceptance criteria**

- [ ] `#/cars` shows only cars with status `AVAILABLE`.
- [ ] Each card shows brand, model, year, plate, and daily rate in BRL.
- [ ] Each card offers `Solicitar aluguel` pointing to
  `#/requests/new?car=<id>`.
- [ ] No edit or delete controls are shown to the client.
- [ ] With no available cars, the screen shows
  `"Nenhum carro disponível no momento."`.
- [ ] A read failure shows a PT-BR alert instead of a silent empty screen.

### US-08 — Start a request from a car

**As a** client, **I want** to click a car and find it already selected in the
form, **so that** I make fewer mistakes.

**Acceptance criteria**

- [ ] The form reads the `car` query parameter and pre-selects the matching car.
- [ ] If the car is no longer available, a warning is shown and the field stays
  empty so the client can choose another vehicle.
- [ ] The form never allows selecting a car that is not `AVAILABLE`.

### US-09 — Create a rental request

**As a** client, **I want** to enter the car, pickup, return, and notes, **so
that** I can request the rental and see the estimated total before submitting.

**Acceptance criteria**

- [ ] The form lists `AVAILABLE` cars with brand, model, plate, and daily rate.
- [ ] After selecting a car and dates, the screen shows the number of days and
  the total from `estimateTotal(dailyRate, startDate, endDate)`.
- [ ] `validateRentalRequest` rejects a missing car/client, an end date on or
  before the start date, and non-text notes.
- [ ] The request is stored with `status: "PENDING"`, the computed
  `estimatedTotal`, `notes`, `reviewNotes: ""`, `createdAt`, and `updatedAt`.
- [ ] There is no editable total field: the value is recomputed from the car's
  daily rate and the dates whenever the selection changes.
- [ ] An overlap with a `CONTRACTED` or `ACTIVE` request for the same car blocks
  saving (see US-43).
- [ ] Success shows a toast, navigates to `#/requests/:id`, and the request
  appears as `Pendente`.
- [ ] With no available cars, the screen shows an empty state linking to
  `#/cars`.

### US-10 — View my requests

**As a** client, **I want** to see only my requests and their statuses, **so
that** I can track progress.

**Acceptance criteria**

- [ ] The list calls `listRequestsForClient(session.clientId)` and filters again
  by `clientId` before rendering.
- [ ] The table shows request, car, period, total, status, and actions; no client
  column is shown.
- [ ] Status labels are the PT-BR `Pendente`, `Em análise`, `Aprovado`,
  `Rejeitado`, `Contratado`, `Ativo`, `Concluído`, and `Cancelado`.
- [ ] Requests are sorted newest first.
- [ ] `Editar` appears only when `canEditRequest` allows it; `Cancelar` only when
  `canCancelRequest` allows it; `Ver` always opens the detail.
- [ ] With no requests, the screen shows
  `"Você ainda não fez nenhum pedido de aluguel."`.

### US-11 — Open a request detail

**As a** client, **I want** to see all data for my request, **so that** I can
check values, dates, and the review notes.

**Acceptance criteria**

- [ ] The detail shows client, car (brand/model/plate/daily rate), period, days,
  total, status, notes, review notes, creation, and update timestamps.
- [ ] A client can open only requests whose `clientId` belongs to them; another
  client gets a permission warning.
- [ ] A missing request shows `"Pedido não encontrado."`; a network failure shows
  a distinct message.
- [ ] Missing client and car references are replaced with `Cliente <id>` and
  `Carro <id>` labels, never `undefined`.
- [ ] Displayed actions are only those allowed by the state and ownership.

### US-12 — Edit my pending request

**As a** client, **I want** to correct the car, dates, or notes, **so that** I
can adjust the request before review.

**Acceptance criteria**

- [ ] Editing is allowed only when the request is `PENDING` and owned by the
  client; any other state shows `"Este pedido não pode mais ser editado."`.
- [ ] The form is pre-filled with current data and recalculates the total when
  the car or dates change.
- [ ] The current car remains selectable even if it is not `AVAILABLE` (for
  example, `RENTED`), but new cars must be available.
- [ ] Saving preserves `status`, `reviewNotes`, `createdAt`, and other untouched
  fields while updating `updatedAt`.
- [ ] Overlap checking ignores the request itself and rejects conflicts with
  `CONTRACTED`/`ACTIVE` requests for the same car.
- [ ] Success shows a toast and returns to the request detail.

### US-13 — Cancel my request

**As a** client, **I want** to cancel a request that has not become a rental,
**so that** I can withdraw without creating a contract.

**Acceptance criteria**

- [ ] `canCancelRequest` allows only owned requests in `PENDING`,
  `UNDER_REVIEW`, or `APPROVED`.
- [ ] The client confirms in a dialog before cancellation.
- [ ] The transition is validated by `assertTransition(..., "client")`; the
  status becomes `CANCELLED` and `updatedAt` changes.
- [ ] Success shows a toast and refreshes the list/detail without a full page
  reload.
- [ ] `CONTRACTED` or `ACTIVE` requests offer no client cancellation; later
  cancellation is an agent action (see US-32).
- [ ] The list shows `Cancelado` and offers no further actions.

### US-14 — Execute a contract for an approved request

**As a** client, **I want** to turn my approved request into a contract, **so
that** I can confirm the rental.

**Acceptance criteria**

- [ ] `Executar contrato` appears only when `canExecuteContract` returns true:
  the client owns the request and its status is `APPROVED`.
- [ ] `#/contracts/new?request=<id>` confirms client, car, request, dates, and
  total in read-only fields.
- [ ] The client chooses `ownershipType` `CLIENT`, `COMPANY`, or `BANK`.
- [ ] `validateContract` rejects missing request/client/car, invalid ownership,
  invalid dates, and a negative total.
- [ ] Success creates the contract with `status: "ACTIVE"`, updates the request
  to `CONTRACTED`, marks the car as `RENTED`, and stores `ownerType`/`ownerId`.
- [ ] Another client's request or a request in another status is rejected, even
  if the URL is typed manually.
- [ ] Success shows a toast and navigates to the contract detail.

### US-15 — Choose ownership and link credit

**As a** client, **I want** to record whether the vehicle belongs to me, the
rental company, or the bank, **so that** the contract reflects the correct
ownership type.

**Acceptance criteria**

- [ ] `CLIENT` resolves the owner to `request.clientId`.
- [ ] `COMPANY` resolves the owner to the first user with `role: "agent"` and
  `agentType: "COMPANY"`; without such a user, execution fails with a message.
- [ ] `BANK` requires an `APPROVED` credit contract for the same client and uses
  `bankId` as the owner.
- [ ] The linkable-credit list shows only `APPROVED` credits for the request's
  client.
- [ ] Linking credit is optional for `CLIENT` and `COMPANY`, but required for
  `BANK`.
- [ ] A credit from another client, not approved, or invalid is rejected before
  any write.
- [ ] The contract detail shows the linked credit, bank, amount, and
  installments when present.

### US-16 — View my contracts

**As a** client, **I want** to see only my rental contracts, **so that** I can
track what is active or completed.

**Acceptance criteria**

- [ ] The list calls `listContractsForClient(session.clientId)` and filters again
  by `clientId`.
- [ ] It shows contract, request, car, period, total, ownership, status, and a
  `Ver` action.
- [ ] Other clients' contracts do not appear; opening someone else's contract
  directly shows a permission warning.
- [ ] A contract whose request no longer exists shows `"Pedido arquivado"`
  (the `ct2` case).
- [ ] Missing client, car, bank, or credit references use fallback labels,
  without `undefined` and without throwing.
- [ ] With no contracts, the screen shows
  `"Você ainda não possui contratos de aluguel."`.

### US-17 — View my credit contracts

**As a** client, **I want** to see only my credit contracts, **so that** I know
which ones can finance a rental.

**Acceptance criteria**

- [ ] The list calls `listCreditContractsForClient(session.clientId)` and
  filters by `clientId`.
- [ ] It shows contract, client, bank, amount, installments, interest, and
  status.
- [ ] The client sees no create, approve, reject, or edit buttons.
- [ ] With no credits, the screen shows
  `"Você ainda não possui contratos de crédito."`.
- [ ] Missing client and bank references use textual fallbacks.

### US-18 — Edit my profile

**As a** client, **I want** to keep my data and employers current, **so that**
request reviews are based on accurate information.

**Acceptance criteria**

- [ ] `#/profile` finds the client by `session.clientId` and, if needed, by
  `userId`.
- [ ] It allows editing name, RG, address, profession, and up to three
  employers; CPF is disabled and cannot be changed from the profile.
- [ ] `validateClient` rejects empty name/address, invalid CPF, more than three
  employers, an employer without a name, and a negative income.
- [ ] The summary shows CPF, e-mail, total income, and the updated name; the
  session name in `localStorage` is updated.
- [ ] Success shows a toast and keeps the user on the screen; a read failure
  shows `"Perfil não encontrado"` or an error with retry.
- [ ] An agent who opens `#/profile` is redirected to `#/`.

---

## Agente Locadora

### US-19 — List and search clients

**As a** rental company agent, **I want** to list, search, and see client income,
**so that** I can serve clients and support the financial review.

**Acceptance criteria**

- [ ] The table shows name, formatted CPF, profession, e-mail, total income, and
  actions.
- [ ] Search filters by name, CPF digits, or e-mail, case-insensitively.
- [ ] The counter shows `"X de Y clientes"` when there are results.
- [ ] With no clients, the screen shows
  `"Nenhum cliente cadastrado. Use “Novo cliente” para começar."`; an empty
  search result has its own message.
- [ ] The `Novo cliente` button opens `#/clients/new`.
- [ ] A read failure offers a retry.

### US-20 — Create a client

**As an** agent, **I want** to register a client with complete data, **so that**
the client can rent cars.

**Acceptance criteria**

- [ ] The form asks for name, CPF, RG, address, profession, and up to three
  employers with company and income.
- [ ] CPF is formatted on blur; an invalid or already registered CPF is
  rejected.
- [ ] `validateClient` blocks empty name, RG, address, or profession, more than
  three employers, and negative income.
- [ ] The record gets an `id` prefixed with `c-`, a `createdAt`, and is written
  to `clients`; clients created by an agent do not automatically receive a
  `users` account.
- [ ] Success shows a toast and returns to the list; failure keeps the data and
  shows an error.

### US-21 — Edit a client

**As an** agent, **I want** to update a client's data, **so that** I can correct
outdated records.

**Acceptance criteria**

- [ ] `#/clients/:id/edit` loads the existing client and fills every field.
- [ ] The same validation as creation applies; CPF duplication ignores the
  current record.
- [ ] Editing preserves `userId`, `createdAt`, and untouched fields.
- [ ] A missing client shows `"Cliente não encontrado"`; a network error offers
  a retry.
- [ ] Success shows a toast and returns to `#/clients`.

### US-22 — Delete a client with reference protection

**As an** agent, **I want** to delete a client only when no dependent records
exist, **so that** JSON Server cascades do not destroy history.

**Acceptance criteria**

- [ ] Deletion asks for confirmation with the client name.
- [ ] Before the DELETE, the app queries `rentalRequests`, `contracts`, and
  `creditContracts` by `clientId`.
- [ ] If any record exists, deletion is blocked and the message lists each
  blocking record's type, id, and status.
- [ ] Requests, contracts, and credits are never deleted in cascade.
- [ ] With no references, the DELETE runs, the row disappears, and a success
  toast appears.
- [ ] An unexpected failure shows an error toast and re-enables the button.

### US-23 — View the whole fleet

**As a** rental company agent, **I want** to see every car and its status, **so
that** I can run the operation.

**Acceptance criteria**

- [ ] The table shows car, year, plate, registration, daily rate, and status.
- [ ] `AVAILABLE`, `RENTED`, and `MAINTENANCE` cars appear with distinct badges.
- [ ] `Editar` and `Excluir` appear only for a rental company agent.
- [ ] With no cars, the screen shows `"Nenhum carro cadastrado."`.
- [ ] A bank agent sees the same table read-only (US-35); a client sees the
  catalog (US-07).

### US-24 — Create and edit cars

**As a** rental company agent, **I want** to maintain the fleet, **so that**
vehicles remain available for rental.

**Acceptance criteria**

- [ ] The form asks for brand, model, year, plate, registration, daily rate, and
  status.
- [ ] `validateCar` rejects empty fields, a year outside 1900..current year + 1,
  a daily rate less than or equal to zero, an invalid status, and an invalid
  `ownerType`.
- [ ] Plate is uppercased; plate and registration remain required strings.
- [ ] On creation, the car starts with `ownerType: "COMPANY"` and the session
  agent's `ownerId`.
- [ ] On edit, untouched fields (for example, current ownership) are preserved.
- [ ] A missing car shows `"Carro não encontrado."`; success shows a toast and
  returns to `#/cars`.

### US-25 — Delete a car with reference protection

**As a** rental company agent, **I want** to delete a car only when it has no
requests or contracts, **so that** history is preserved.

**Acceptance criteria**

- [ ] Deletion asks for confirmation with brand/model and plate.
- [ ] The app queries `rentalRequests` and `contracts` by `carId` before the
  DELETE.
- [ ] With references, deletion is blocked and the message names the requests
  and contracts with their periods.
- [ ] Without references, the car is removed, the list refreshes, and a success
  toast appears.
- [ ] An unexpected error does not delete the car and shows a failure toast.

### US-26 — Filter and review the request queue

**As a** rental company agent, **I want** to see every request and filter by
status, **so that** I can prioritize reviews.

**Acceptance criteria**

- [ ] The agent list shows all requests with client, car, period, total, and
  status.
- [ ] The status filter uses `#/requests?status=...` and options come from
  `REQUEST_STATUS`.
- [ ] Requests are sorted newest first.
- [ ] The main action opens the detail with the label `Analisar`.
- [ ] With no requests, the screen shows `"Nenhum pedido de aluguel cadastrado."`;
  a filtered empty result mentions the status.
- [ ] A client sees only their own requests (US-10).

### US-27 — Start reviewing a request

**As an** agent, **I want** to move a pending request to `Em análise`, **so
that** everyone knows it is being evaluated.

**Acceptance criteria**

- [ ] `Iniciar análise` appears only for an agent and a `PENDING` request.
- [ ] `assertTransition("PENDING", "UNDER_REVIEW", "agent")` runs before the
  write.
- [ ] The update stores `status: "UNDER_REVIEW"` and `updatedAt`.
- [ ] A toast confirms `"Pedido enviado para análise."` and the screen
  re-renders.
- [ ] Terminal states show no action, and invalid transitions are rejected by
  the domain.

### US-28 — Approve or reject a request

**As an** agent, **I want** to record review notes and decide on the request,
**so that** contracting can proceed or the request can be closed.

**Acceptance criteria**

- [ ] Actions appear only in `UNDER_REVIEW` and only for agents.
- [ ] The agent sees client, car, period, and estimated total; total client
  income can be checked on the client list. The financial review is manual and
  has no automatic score.
- [ ] `Aprovar` moves `UNDER_REVIEW` → `APPROVED` and accepts optional notes.
- [ ] `Rejeitar` requires non-empty notes; without them, the field is highlighted
  and no transition happens.
- [ ] Notes are stored in `reviewNotes`, the transition is validated by the
  domain, and `updatedAt` is refreshed.
- [ ] A toast confirms the action; `REJECTED` is terminal and shows no further
  transitions.
- [ ] An `APPROVED` request shows `Executar contrato` only to the owning client
  (US-14).

### US-29 — View all rental contracts

**As a** rental company agent, **I want** to see rental contracts, **so that** I
can track the operation.

**Acceptance criteria**

- [ ] The list shows contract, request, client, car, period, total, ownership,
  status, and a `Ver` action.
- [ ] The detail shows request, client, car, dates, total, ownership, linked
  credit, status, and creation.
- [ ] A contract without a matching request shows `"Pedido arquivado"` and does
  not break the screen.
- [ ] Missing client, car, bank, or credit references use textual fallbacks.
- [ ] With no contracts, the screen shows
  `"Nenhum contrato de aluguel cadastrado."`.

### US-30 — Start the rental

**As an** agent, **I want** to move a contracted agreement to active, **so
that** I can record the vehicle pickup.

**Acceptance criteria**

- [ ] `Iniciar locação` appears for an `ACTIVE` contract whose request is
  `CONTRACTED`.
- [ ] The `CONTRACTED` → `ACTIVE` transition is validated for the `agent` role.
- [ ] The request receives `status: "ACTIVE"` and `updatedAt`; the contract stays
  `ACTIVE` and the car stays `RENTED`.
- [ ] Success shows a toast and changes the actions to `Concluir locação` and
  `Cancelar locação`.
- [ ] A contract without a request (archived) offers no actions.

### US-31 — Complete the rental

**As an** agent, **I want** to complete an active rental, **so that** the car is
released and the contract is closed.

**Acceptance criteria**

- [ ] `Concluir locação` appears for an `ACTIVE` request and asks for
  confirmation.
- [ ] The `ACTIVE` → `COMPLETED` transition is validated for `agent`.
- [ ] The request becomes `COMPLETED`, the contract becomes `COMPLETED`, and the
  car returns to `AVAILABLE`.
- [ ] `ownershipType` and the other ownership data on the contract are
  preserved.
- [ ] The toast confirms completion and the screen reloads without rental
  actions.
- [ ] A failure at any step is reported and logged to the console.

### US-32 — Cancel the rental

**As an** agent, **I want** to cancel a contracted or active agreement, **so
that** the rental is closed and the car is returned.

**Acceptance criteria**

- [ ] The action appears for a `CONTRACTED` or `ACTIVE` request, with
  confirmation.
- [ ] The transition to `CANCELLED` is validated by state and role.
- [ ] The request and contract become `CANCELLED`; the car returns to
  `AVAILABLE`.
- [ ] Ownership recorded on the car and contract is not erased.
- [ ] The toast confirms the action and the screen offers no further rental
  actions.
- [ ] An archived or terminal contract cannot be cancelled.

### US-33 — View credit contracts read-only

**As a** rental company agent, **I want** to view credit contracts, **so that**
I know whether a rental can be financed by a bank.

**Acceptance criteria**

- [ ] The list shows contract, client, bank, amount, installments, interest, and
  status.
- [ ] The rental company sees no `Novo contrato`, `Analisar`, or `Editar`
  buttons.
- [ ] `#/credit-contracts/new` and `#/credit-contracts/:id/edit` are blocked for
  a `COMPANY` agent.
- [ ] With no credits, the screen shows
  `"Nenhum contrato de crédito cadastrado."`.
- [ ] Missing references use fallbacks, without `undefined`.

---

## Agente Banco

### US-34 — Manage clients

**As a** bank agent, **I want** to list, search, create, edit, and delete
clients, **so that** the base used for reviews and credit is accurate.

**Acceptance criteria**

- [ ] The bank can access `#/clients` and the client forms.
- [ ] The same criteria from US-19 to US-22 apply.
- [ ] Deletion remains blocked by requests, contracts, and credit contracts.
- [ ] The bank cannot manage cars (US-35).
- [ ] Protected client routes redirect guests and clients.

### US-35 — Browse the fleet read-only

**As a** bank agent, **I want** to view cars, **so that** I know which vehicles
can be financed, without changing them.

**Acceptance criteria**

- [ ] `#/cars` shows the whole fleet to the bank.
- [ ] `Novo carro`, `Editar`, and `Excluir` buttons do not appear.
- [ ] `#/cars/new` and `#/cars/:id/edit` are blocked by the router and the view.
- [ ] The bank never calls `createCar`, `updateCar`, or `deleteCar`.
- [ ] With no cars, the standard empty state appears.

### US-36 — Review rental requests

**As a** bank agent, **I want** to review rental requests, **so that** I can
contribute to the financial analysis.

**Acceptance criteria**

- [ ] `canReviewRequests` lets the bank see all requests and filter by status.
- [ ] The bank can perform the transitions from US-27 and US-28, with mandatory
  notes on rejection.
- [ ] The queue shows client, car, period, total, and status.
- [ ] Approved credits for the client become available for the client to link
  when executing the contract (US-15).
- [ ] No invalid transition is rendered or accepted by the domain.

### US-37 — List credit contracts

**As a** bank agent, **I want** to see all credit contracts, **so that** I can
track the portfolio.

**Acceptance criteria**

- [ ] `#/credit-contracts` lists every credit contract, without filtering by
  `bankId`.
- [ ] The table shows contract, client, bank, amount, installments, interest,
  status, and an `Analisar`/`Editar` action.
- [ ] `Novo contrato de crédito` appears only for the bank.
- [ ] With no credits, the screen shows
  `"Nenhum contrato de crédito cadastrado."`.
- [ ] Missing client and bank references use textual fallbacks.

### US-38 — Create a credit contract

**As a** bank agent, **I want** to create a credit request for a client, **so
that** a rental can be financed.

**Acceptance criteria**

- [ ] The form asks for client, amount, installments, and interest rate; the
  bank's name from the session is displayed.
- [ ] With no registered clients, the screen shows an empty state and blocks the
  form.
- [ ] `validateCreditContract` rejects a missing client/bank, an amount less
  than or equal to zero, installments outside 1..60, negative interest, and an
  invalid status.
- [ ] `bankId` is the session id; the status is always `PENDING` on creation,
  regardless of form input.
- [ ] Success stores `createdAt`, shows
  `"Contrato de crédito criado como pendente."`, and returns to the list.
- [ ] No other role can open the form.

### US-39 — Approve or reject credit

**As a** bank agent, **I want** to review and decide on a credit contract, **so
that** financing can be released or denied.

**Acceptance criteria**

- [ ] `#/credit-contracts/:id/edit` loads the credit and allows changing client,
  amount, installments, interest, and status.
- [ ] Status can be `PENDING`, `APPROVED`, or `REJECTED`; the change is a
  validated edit, not a separate endpoint.
- [ ] `updateCreditContract` revalidates the complete record before the PUT.
- [ ] The toast distinguishes approval, rejection, and a regular update.
- [ ] An `APPROVED` credit for the client becomes eligible for `BANK` ownership
  (US-15); `PENDING` and `REJECTED` credits do not appear in the link list.
- [ ] A missing credit shows `"Contrato de crédito não encontrado."`; a network
  error keeps the form.

### US-40 — Track rental contracts and operate rentals

**As a** bank agent, **I want** to view contracts and, when necessary, operate
the rental, **so that** I can track financed vehicles.

**Acceptance criteria**

- [ ] The bank sees every contract at `#/contracts` and the full detail.
- [ ] In the current implementation, `canReviewRequests` also lets the bank
  `Iniciar`, `Concluir`, and `Cancelar` a rental, with the validations from
  US-30 to US-32.
- [ ] A contract without a request shows `"Pedido arquivado"` and offers no
  actions.
- [ ] The bank cannot create or edit rental contracts directly: creation remains
  an action of the request's owning client.
- [ ] Missing references use textual fallbacks.

---

## Cross-cutting system rules

### US-41 — Enforce role and ownership authorization

**As the** system, **I want** to block unauthorized access even when a URL is
typed manually, **so that** client and agent data is protected.

**Acceptance criteria**

- [ ] `permissions.js` is the single source of role and ownership decisions.
- [ ] A client cannot access `#/clients`, `#/clients/new`,
  `#/clients/:id/edit`, or credit forms; an agent cannot access `#/profile`.
- [ ] Protected routes use `roles` in the router; views repeat the check and
  render a PT-BR 403 when called directly.
- [ ] A client sees only requests, contracts, and credits whose `clientId`
  matches the session; agents see all.
- [ ] A rental company agent cannot manage credit; a bank agent cannot manage
  cars.
- [ ] Edit/cancel/execute request actions are rejected by the domain even if the
  button is removed from the HTML.
- [ ] The matrix in the “Permission matrix” section is covered by
  `tests/permissions.test.js`.

### US-42 — Reject invalid state transitions

**As the** system, **I want** to enforce the request state machine, **so that**
the rental flow cannot skip steps.

**Acceptance criteria**

- [ ] The only accepted transitions are: `PENDING → UNDER_REVIEW`,
  `PENDING → CANCELLED`, `UNDER_REVIEW → APPROVED`,
  `UNDER_REVIEW → REJECTED`, `UNDER_REVIEW → CANCELLED`,
  `APPROVED → CONTRACTED`, `APPROVED → CANCELLED`,
  `CONTRACTED → ACTIVE`, `CONTRACTED → CANCELLED`, `ACTIVE → COMPLETED`, and
  `ACTIVE → CANCELLED`.
- [ ] Each transition requires the correct role (`client` owner or `agent`).
- [ ] `REJECTED`, `COMPLETED`, and `CANCELLED` are terminal.
- [ ] `canTransition`, `allowedTransitions`, and `assertTransition` agree with
  each other and with the table.
- [ ] Invalid actions are not rendered; if called, `assertTransition` throws
  `DomainError` before any write.
- [ ] `tests/request-state.test.js` covers every allowed and forbidden
  transition.

### US-43 — Detect booking overlap

**As the** system, **I want** to prevent two rentals of the same car in the same
period, **so that** reservations do not conflict.

**Acceptance criteria**

- [ ] The check considers only `CONTRACTED` and `ACTIVE` requests for the same
  car.
- [ ] The interval is inclusive at the start and exclusive at the end:
  `[10,15)` and `[15,20)` do not overlap; `[10,15)` and `[14,16)` do.
- [ ] Creating or editing a request rejects the conflict and shows the blocking
  request id.
- [ ] When editing, the request itself is ignored in the comparison.
- [ ] The PT-BR message explains that the request is already contracted or
  active.
- [ ] `datesOverlap` is covered by `tests/validation.test.js`.

### US-44 — Validate every entity before writing

**As the** system, **I want** to validate data in the domain before calling the
API, **so that** consistency holds even with incomplete forms.

**Acceptance criteria**

- [ ] Client: name, valid CPF, address, up to three employers, employer name,
  and income greater than or equal to zero.
- [ ] Car: registration, plate, brand, and model required; year between 1900 and
  current year + 1; daily rate greater than zero; valid status and ownership.
- [ ] Request: client and car required; end date after start date; non-negative
  total; textual notes.
- [ ] Contract: request, client, car, ownership, dates, total, and status valid.
- [ ] Credit: bank, client, amount greater than zero, installments from 1 to 60,
  interest greater than or equal to zero, and valid status.
- [ ] Field errors are shown in PT-BR; focus moves to the first invalid field.
- [ ] `tests/validation.test.js` covers each entity's limits.

### US-45 — Handle archived records and missing references

**As a** user, **I want** historical records to remain readable, **so that** the
`ct2` contract is not lost and the UI does not break.

**Acceptance criteria**

- [ ] Seed contract `ct2` points to request `r0`; list and detail show
  `"Pedido arquivado"` without errors.
- [ ] Missing client, car, bank, or credit references are replaced with labels
  such as `"Cliente <id> (não encontrado)"`.
- [ ] No screen renders `undefined`, `null`, or `NaN` because of a missing
  reference.
- [ ] Lists and details keep working when an auxiliary lookup fails; the error
  goes to the console and the screen shows the fallback.
- [ ] Archived contracts offer no rental actions.
- [ ] The rule applies to requests, contracts, credits, clients, and cars.

### US-46 — Show empty states and consistent feedback

**As a** user, **I want** to understand empty screens and the result of my
actions, **so that** I do not confuse “empty” with “error”.

**Acceptance criteria**

- [ ] Clients, cars, requests, contracts, and credits each have a specific empty
  message.
- [ ] A search with no results is distinct from an empty base.
- [ ] No available car, no approved credit, and no client for credit each have
  their own empty state.
- [ ] Successful actions show success toasts; failures show a toast or alert in
  PT-BR.
- [ ] Buttons are disabled during writes to avoid duplicate submissions.
- [ ] Load errors offer retry when the screen supports it.

### US-47 — Keep the session free of passwords

**As the** system, **I want** to store only a minimal user snapshot, **so that**
credential exposure in the browser is reduced.

**Acceptance criteria**

- [ ] The key is `diw-lab02.session` and contains only `id`, `name`, `email`,
  `role`, `agentType`, and `clientId`.
- [ ] `password`, `organization`, and any other sensitive field are not copied
  into `localStorage`.
- [ ] An invalid role or `agentType` makes `getSession` return `null`.
- [ ] The navbar and views read the normalized session, never the raw `users`
  record.
- [ ] Logout removes the key.
- [ ] The plain-text authentication limitation is documented in the README and
  ADR 0003.

---

## Permission matrix

| Action | Client | Rental company agent | Bank agent |
| --- | :---: | :---: | :---: |
| Register / log in | yes | yes | yes |
| Edit own profile | yes | no | no |
| List/manage clients | no | yes | yes |
| Manage cars | no | yes | no |
| Browse fleet | available only | yes | yes (read-only) |
| Create/edit request | own and `PENDING` | no | no |
| Cancel request | own through `APPROVED` | via rental | via rental |
| Review request | no | yes | yes |
| Execute contract | own and `APPROVED` | no | no |
| Start/complete/cancel rental | no | yes | yes (current code) |
| Manage credit contracts | no | no | yes |
| View credit contracts | own | all (read-only) | all |

## Coverage map

| PDF requirement / flow | Stories |
| --- | --- |
| System only after prior registration | US-01, US-02, US-04, US-41 |
| Client introduces a request | US-08, US-09 |
| Client modifies a request | US-12 |
| Client views request and status | US-10, US-11 |
| Client cancels a request | US-13 |
| Agents modify and evaluate requests | US-26, US-27, US-28, US-36 |
| Financial review and positive opinion unlock contracting | US-19, US-28, US-14 |
| Client data: RG, CPF, name, address, profession | US-01, US-18, US-20, US-21 |
| Employers and incomes, maximum 3 | US-01, US-18, US-20, US-44 |
| Vehicle ownership: client, company, or bank | US-14, US-15, US-29, US-40 |
| Car: registration, year, brand, model, plate | US-23, US-24 |
| Rental linked to a bank credit contract | US-15, US-17, US-38, US-39 |
| Client CRUD (Lab02S02) | US-19 to US-22, US-34 |
| Prototype creates and shows request status (Lab02S03) | US-09, US-10, US-11 |
| Permissions and ownership | US-41, matrix above |
| Validation | US-01, US-18, US-20, US-24, US-38, US-44 |
| Booking overlap | US-09, US-12, US-43 |
| Archived records | US-16, US-29, US-40, US-45 |
| Empty states and feedback | US-07, US-10, US-19, US-23, US-26, US-29, US-33, US-37, US-46 |
