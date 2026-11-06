# Apresentação final — Sistema de Aluguel de Carros

**Disciplina:** Desenvolvimento de Interfaces Web (DIW) — PUC Minas, 2026/2
**Autor:** Fernando Leite Pagani
**Entrega:** Laboratório 02 — Sistema de Aluguel de Carros
**Repositório:** <https://github.com/fernandoleitepagani/diw-lab02>

> Roteiro de slides em Markdown. Cada bloco separado por `---` é um slide.
> As falas sugeridas são curtas; a demonstração ao vivo segue
> [`docs/demo-script.md`](demo-script.md).

---

## Slide 1 — Sistema de Aluguel de Carros

- Protótipo web funcional para gestão de aluguel de automóveis.
- Três perfis: **Cliente**, **Agente Locadora** e **Agente Banco**.
- Do pedido ao contrato: análise financeira, crédito, propriedade do veículo e
  ciclo da locação.
- Aplicação local em <http://localhost:3000>.

**Fala sugerida:** "Este é o Lab 02 de DIW: um sistema de aluguel de carros
com pedidos, análise por agentes, contratos de aluguel e contratos de crédito."

---

## Slide 2 — O problema

- O cliente precisa **criar, modificar, consultar e cancelar** pedidos pela
  internet.
- Os agentes precisam **analisar financeiramente** os pedidos e emitir parecer.
- Com parecer positivo, o cliente **executa o contrato** de aluguel.
- O contrato pode registrar o carro como propriedade de **cliente, locadora ou
  banco**.
- O aluguel pode estar associado a um **contrato de crédito** concedido por um
  banco agente.

**Fala sugerida:** "O sistema não é só um CRUD de carros: ele modela o fluxo
de decisão entre cliente, locadora e banco."

---

## Slide 3 — O que o PDF pede

| Entrega do enunciado | Onde está |
| --- | --- |
| Modelagem: casos de uso, histórias, classes, pacotes | `docs/uml/` e `docs/user-stories.md` |
| Revisão dos diagramas + componentes + CRUD de cliente | `docs/uml/component-diagram.md`, `public/js/ui/views/clients.js`, `client-form.js`, `profile.js` |
| Protótipo que cria e mostra o status do pedido | `requests.js`, `request-form.js`, `request-detail.js` |
| README no template do professor | `README.md` |
| Repositório GitHub com modelos e código final | histórico Git + repositório público |
| Apresentação final: protótipo × modelos × mudanças | esta apresentação + `docs/demo-script.md` |

**Fala sugerida:** "As três sprints do PDF estão cobertas; a diferença de
tecnologia está documentada e será explicada no slide de mudanças."

---

## Slide 4 — Stack e decisões

| Camada | Escolha |
| --- | --- |
| Interface | HTML5, CSS3 e **Bootstrap 5.3.3 vendorizado** |
| Lógica | **JavaScript ES2022**, ES Modules, sem framework e sem build |
| Roteamento | Router por hash próprio (`public/js/router.js`) |
| Persistência | **JSON Server 0.17.4** sobre `db.json` |
| Testes | `node:test` — 52 testes de domínio |
| Diagramas | Mermaid em Markdown |

- **Sem build:** `npm install && npm start` é suficiente.
- **Offline:** Bootstrap e todo o código estão no repositório.
- Decisões registradas nos ADRs 0001–0004.

**Fala sugerida:** "O enunciado sugere Java/MVC. A entrega usa JavaScript puro
com a mesma separação em camadas; o ADR 0001 registra o trade-off."

---

## Slide 5 — Arquitetura

```text
ui/views  →  data/  →  api.js  →  JSON Server  →  db.json
    ↓
domain/ (CPF, validação, preço, permissões, máquina de estados)
    ↓
session.js + format.js
```

- **app/router:** composição, tabela de rotas e guards de autenticação/papel.
- **ui:** layout, componentes e 16 telas; não recalculam workflow inline.
- **domain:** funções puras, sem DOM, `fetch` ou `localStorage`.
- **data:** repositórios e fluxos com múltiplas escritas.
- **api:** cliente `fetch` fino com `ApiError`.
- **session/format:** sessão sem senha, datas, BRL, labels e escape HTML.

**Fala sugerida:** "A separação é a mesma de um MVC: apresentação, domínio,
dados e API. O diagrama de componentes mostra o caminho completo."

---

## Slide 6 — Modelo de domínio

**Entidades:** `User`, `Client`, `Employer`, `Car`, `RentalRequest`,
`Contract`, `CreditContract`.

- Cliente tem CPF válido e **até 3 vínculos empregatícios**.
- Carro tem matrícula, ano, marca, modelo, placa, diária e status
  (`AVAILABLE`, `RENTED`, `MAINTENANCE`).
- Pedido tem período, total estimado e **8 estados**.
- Contrato registra propriedade (`CLIENT`, `COMPANY`, `BANK`) e crédito
  opcional.
- Crédito tem valor, parcelas, juros e status (`PENDING`, `APPROVED`,
  `REJECTED`).

**Fluxo do pedido:**

```text
PENDING → UNDER_REVIEW → APPROVED → CONTRACTED → ACTIVE → COMPLETED
                ↓             ↓           ↓          ↓
             REJECTED      CANCELLED   CANCELLED  CANCELLED
```

**Fala sugerida:** "O estado não é um campo livre: `request-state.js` define
quem pode fazer cada transição."

---

## Slide 7 — Demonstração ao vivo (5–7 min)

| Tempo | Ator | O que mostra |
| --- | --- | --- |
| 0:30 | Ana (cliente) | cria, edita e cancela um pedido |
| 1:30 | Locadora Move | `PENDING → UNDER_REVIEW → APPROVED` com parecer |
| 2:20 | Carla (cliente) | executa o Onix com `cc3` e propriedade **Banco** |
| 3:20 | Banco Aurora | cria e aprova um contrato de crédito |
| 4:20 | Locadora Move | inicia, conclui e libera o Onix |
| 5:40 | Locadora Move | contrato histórico `ct2` com "Pedido arquivado" |

- Pré-requisito: `npm run reset && npm start`.
- Credenciais e cliques exatos em [`docs/demo-script.md`](demo-script.md).

**Fala sugerida:** "A demo inteira parte do banco semeado e não precisa de
edição manual."

---

## Slide 8 — Modelo → código (classes e pacotes)

| Elemento do modelo | Implementação |
| --- | --- |
| `User` | `db.seed.json`, `data/users.js`, `session.js` |
| `Client` / `Employer` | `data/clients.js`, `domain/validation.js` (`MAX_EMPLOYERS = 3`) |
| `Car` | `data/cars.js`, `cars.js`, `car-form.js` |
| `RentalRequest` | `data/requests.js`, `request-form.js`, `request-detail.js` |
| `Contract` | `data/contracts.js`, `contract-form.js`, `contracts.js` |
| `CreditContract` | `data/credit-contracts.js`, `credit-contract-form.js`, `credit-contracts.js` |
| Diagrama de pacotes | pastas reais `public/js/{app,routes,router,api,domain,data,ui}`, `tests/`, `docs/` |
| Diagrama de componentes | `index.html` + `app.js`, router, views, domain, data, `api.js`, JSON Server, `db.json`, `localStorage` |

**Fala sugerida:** "O diagrama de classes foi revisado contra os campos que
realmente estão no seed e nos repositórios, não contra um modelo ideal."

---

## Slide 9 — Modelo → código (casos de uso e regras)

| Caso de uso | Onde a regra vive |
| --- | --- |
| Criar/editar/cancelar pedido | `permissions.js` + `request-state.js` + views de pedidos |
| Analisar pedido | `request-detail.js`; `PENDING → UNDER_REVIEW → APPROVED/REJECTED`; rejeição exige parecer |
| Executar contrato | `contract-form.js` + `executeContract` em `data/contracts.js` |
| Iniciar/concluir/cancelar locação | `startRental`, `completeRental`, `cancelRental` em `data/contracts.js` |
| Gerenciar crédito | `credit-contract-form.js` + `data/credit-contracts.js` |
| Permissões por papel | `permissions.js`; guards em `routes.js` e `router.js` |

- `ownershipType` resolve o proprietário:
  - `CLIENT` → `request.clientId`
  - `COMPANY` → usuário agente `COMPANY`
  - `BANK` → `creditContract.bankId` (exige crédito aprovado)
- O diagrama de casos de uso registra que **qualquer agente** pode analisar
  pedidos e operar contratos, porque `canReviewRequests` é `isAgent`.

**Fala sugerida:** "As regras de workflow não estão duplicadas nas telas: as
views chamam o domínio e os repositórios."

---

## Slide 10 — Mudanças feitas durante o desenvolvimento

1. **Stack:** o PDF pede Java/MVC; a entrega usa JavaScript puro com separação
   em camadas equivalente, sem build e funcionando offline. Decisão e
   trade-offs no [ADR 0001](adr/0001-vanilla-js-hash-router.md).
2. **Máquina de estados:** o fluxo inicial foi ampliado para 8 estados,
   separando `CONTRACTED` (contrato executado) de `ACTIVE` (locação iniciada)
   e `COMPLETED`; o contrato nasce `ACTIVE`.
3. **Registro histórico:** o contrato `ct2` aponta para o pedido `r0`, que não
   existe. Lista e detalhe passaram a mostrar **"Pedido arquivado"** em vez de
   quebrar ou renderizar `undefined`; a nota foi incluída no diagrama de
   classes.
4. **JSON Server 0.17.4:** o bug de FK `null` no `DELETE` obrigou a **omitir**
   campos opcionais `*Id` em vez de gravá-los como `null`
   ([ADR 0002](adr/0002-json-server-single-dependency.md)).
5. **Autenticação:** senhas em texto puro apenas para a demonstração
   ([ADR 0003](adr/0003-demo-auth-plaintext.md)); Bootstrap vendorizado
   ([ADR 0004](adr/0004-vendored-bootstrap.md)).
6. **Revisão dos modelos:** o diagrama de casos de uso foi atualizado para
   refletir o código — agentes bancários também analisam pedidos e operam
   locações na implementação atual.

**Fala sugerida:** "Onde o código precisou divergir do modelo inicial, o
modelo foi atualizado e a decisão foi registrada; não escondemos a diferença."

---

## Slide 11 — Como a entrega responde aos critérios do PDF

| Critério do PDF | Como foi atendido | Evidência |
| --- | --- | --- |
| **Qualidade do sistema / adequação aos requisitos** | Cadastro e login, CRUD de clientes, pedidos com status, análise por agentes, contratos, crédito, propriedade e locação | demo ao vivo; `docs/user-stories.md`; 52 testes de domínio |
| **Alinhamento entre modelo (classes e arquitetura) e código** | Diagramas de classes, pacotes e componentes descrevem os campos, pastas e componentes reais | `docs/uml/*.md` + tabelas dos slides 8 e 9 |
| **Atualizações dos modelos conforme necessidade** | Estado `CONTRACTED`, fallback `ct2`, regra de FK do JSON Server, auth demo, permissão de agentes | ADRs 0001–0004; notas em `docs/uml/`; histórico Git |
| **Apresentação final: protótipo × modelos iniciais × mudanças** | Demo dos fluxos, comparação modelo→código e lista explícita de mudanças | esta apresentação + `docs/demo-script.md` |

**Fala sugerida:** "Os três aspectos de avaliação e a exigência de
apresentação final estão mapeados nesta tabela."

---

## Slide 12 — Limitações conhecidas

- **Autenticação demo:** senhas em texto puro; sem hash, reset ou expiração.
- **Autorização só no cliente:** o JSON Server aceita chamadas diretas.
- **JSON Server local:** sem deploy público, banco real ou concorrência.
- **Fluxos não atômicos:** contrato + pedido + carro são três escritas; falha
  no meio não reverte as anteriores.
- **Sem pagamento:** valores são estimativas acadêmicas.
- **Sem validação server-side:** as regras de `domain/validation.js` rodam no
  navegador.
- **Registro histórico:** `ct2` não tem pedido correspondente; a UI aplica o
  fallback "Pedido arquivado".

**Fala sugerida:** "São limitações conscientes de um protótipo de laboratório,
todas documentadas no README."

---

## Slide 13 — Próximos passos

- Migrar a persistência para um backend **Java/Spring Boot MVC**, mantendo o
  contrato REST e as regras de domínio.
- Hash de senha, autorização no servidor e sessão com expiração.
- Transações para execução/conclusão de contrato.
- Testes E2E automatizados do roteiro de demonstração.
- Deploy público e pipeline de CI.
- Pagamento, calendário de disponibilidade e auditoria de acessibilidade.

**Fala sugerida:** "O domínio puro foi desenhado para sobreviver à troca de
persistência; o próximo passo natural é o backend Java que o enunciado pede."

---

## Slide 14 — Encerramento

- Repositório: <https://github.com/fernandoleitepagani/diw-lab02>
- Documentação: `README.md`, `docs/uml/`, `docs/user-stories.md`, ADRs.
- Demo: `npm run reset && npm start` → <http://localhost:3000>.
- Testes: `npm test` — 52 passando.
- Perguntas.

**Fala sugerida:** "Obrigado. O sistema está rodando localmente e o roteiro
completo da demo está no repositório."
