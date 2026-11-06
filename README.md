# DIW LAB 02 — Sistema de Aluguel de Carros

Trabalho da disciplina **Desenvolvimento de Interfaces Web (DIW)**, PUC Minas,
2026/2. Aplicação web para gestão de aluguel de carros com três perfis
(Cliente, Agente Locadora e Agente Banco), construída com JavaScript puro,
Bootstrap 5.3 vendorizado e JSON Server.

**Autor:** Fernando Leite Pagani
**Curso:** Ciência da Computação — PUC Minas
**Professor:** João Paulo Carneiro Aramuni

---

## Status do projeto

Concluído para a entrega do Laboratório 02 (2026/2): modelagem, CRUD de
clientes, protótipo de pedidos, contratos, contratos de crédito e documentação.
A aplicação roda localmente; não há deploy público.

## Índice

- [Status do projeto](#status-do-projeto)
- [Sobre o projeto](#sobre-o-projeto)
- [Autor](#autor)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Instalação e execução](#instalação-e-execução)
- [Scripts](#scripts)
- [Credenciais de demonstração](#credenciais-de-demonstração)
- [UML e histórias de usuário](#uml-e-histórias-de-usuário)
- [API local](#api-local)
- [Entregáveis do PDF](#entregáveis-do-pdf)
- [Demonstração em 5 passos](#demonstração-em-5-passos)
- [Testes](#testes)
- [Limitações conhecidas](#limitações-conhecidas)
- [Documentação e decisões](#documentação-e-decisões)
- [Licença](#licença)

---

## Sobre o projeto

O sistema apoia a operação de uma locadora de automóveis. Clientes se cadastram,
consultam a frota disponível, criam e acompanham pedidos de aluguel. Agentes da
locadora gerenciam clientes e carros, analisam pedidos e operam os contratos.
Agentes do banco gerenciam contratos de crédito, também analisam pedidos e
acompanham os contratos de aluguel.

O projeto foi desenvolvido para o Laboratório 02 da disciplina. O enunciado
sugere Java com arquitetura MVC; nesta entrega a mesma separação de
responsabilidades (apresentação, domínio, dados e API) foi implementada com
**ES Modules em JavaScript**, sem framework e sem build. A decisão e os
trade-offs estão registrados no
[ADR 0001](docs/adr/0001-vanilla-js-hash-router.md).

O valor entregue é um protótipo funcional, executável localmente, que cobre o
cadastro de clientes, o ciclo completo de pedidos de aluguel, contratos,
contratos de crédito e a relação de propriedade dos veículos.

---

## Autor

- **Fernando Leite Pagani**
- **Curso:** Ciência da Computação — PUC Minas
- **Disciplina:** Desenvolvimento de Interfaces Web (DIW)
- **Professor:** João Paulo Carneiro Aramuni

---

## Funcionalidades

### Cliente

- Cadastro com CPF válido, RG, endereço, profissão e até 3 vínculos
  empregatícios.
- Login e sessão persistente em `localStorage`, sem senha armazenada na sessão.
- Catálogo somente com carros `AVAILABLE` e atalho para solicitar aluguel.
- Criação de pedido com carro, período, observações e total estimado calculado.
- Edição e cancelamento apenas dos próprios pedidos, respeitando o estado.
- Acompanhamento de status, aprovação e parecer da análise.
- Execução de contrato de pedido aprovado, com escolha de propriedade
  (`CLIENT`, `COMPANY`, `BANK`) e vínculo opcional de crédito aprovado.
- Consulta dos próprios contratos de aluguel e contratos de crédito.
- Edição do próprio perfil; CPF é somente leitura.

### Agente Locadora

- CRUD de clientes com busca por nome, CPF ou e-mail e bloqueio de exclusão por
  registros vinculados.
- CRUD de carros com validação de ano, placa, matrícula, diária e status.
- Fila de pedidos com filtro por status.
- Análise de pedidos: início, aprovação e rejeição com parecer obrigatório.
- Operação de contratos: iniciar, concluir e cancelar locação.
- Consulta somente leitura de contratos de crédito.

### Agente Banco

- CRUD de clientes.
- Consulta da frota em modo somente leitura.
- Análise de pedidos.
- CRUD de contratos de crédito, com criação em `PENDING` e aprovação/rejeição.
- Acompanhamento de contratos de aluguel.

### Transversal

- Rotas por hash com guards de autenticação e papel.
- Domínio puro: CPF, validação, preço, permissões e máquina de estados.
- Bloqueio de sobreposição de agenda em pedidos `CONTRACTED`/`ACTIVE`.
- Fallbacks para registros históricos e referências ausentes.
- Estados vazios, toasts de sucesso/erro e mensagens em PT-BR.

---

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Interface | HTML5, CSS3, Bootstrap 5.3.3 vendorizado em `public/vendor/bootstrap/` |
| Lógica | JavaScript ES2022, ES Modules, sem framework e sem bundler |
| Roteamento | Router por hash próprio (`public/js/router.js`) |
| Persistência | JSON Server 0.17.4 sobre `db.json` |
| Testes | `node:test` (Node.js) |
| Diagramas | Mermaid em Markdown |
| Versionamento | Git e GitHub |

**Pré-requisito:** Node.js 20 ou superior.

---

## Arquitetura

A aplicação segue uma separação em camadas inspirada em MVC, adaptada a uma SPA:

```
ui/views  →  data/  →  api.js  →  JSON Server  →  db.json
    ↓
domain/ (regras puras)
    ↓
session.js + format.js
```

- **`app` / `router`:** composição, tabela de rotas, parâmetros `:id` e guards.
- **`ui`:** layout, componentes e 16 telas; chama repositórios e regras de
  domínio, sem recalcular workflow inline.
- **`domain`:** funções puras para CPF, validação, preço, permissões e máquina de
  estados. Não usa DOM, `fetch` nem `localStorage`.
- **`data`:** repositórios que encapsulam coleções, checagens de referência e
  fluxos com múltiplas escritas.
- **`api`:** cliente `fetch` fino, com `ApiError`, URLs centralizadas e leitura
  de corpo.
- **`session` / `format`:** sessão sem senha e formatação/escape para PT-BR.

Padrões adotados: composition root, repository, funções puras de domínio,
máquina de estados explícita e route guards.

Diagramas completos:

- [Casos de uso](docs/uml/use-cases.md)
- [Classes](docs/uml/class-diagram.md)
- [Pacotes](docs/uml/package-diagram.md)
- [Componentes](docs/uml/component-diagram.md)

---

## Estrutura de pastas

```
DIW-LAB02/
├── package.json
├── package-lock.json
├── db.seed.json                  # dados iniciais versionados
├── db.json                       # banco em execução, ignorado pelo Git
├── .gitignore
├── .editorconfig
├── README.md
├── GLOSSARY.md
├── scripts/
│   └── ensure-db.mjs             # cria/restaura db.json
├── public/
│   ├── index.html                # entrada única da SPA
│   ├── css/
│   │   └── app.css               # pequenos ajustes sobre o Bootstrap
│   ├── vendor/
│   │   └── bootstrap/            # Bootstrap 5.3.3 local
│   └── js/
│       ├── app.js                # composition root
│       ├── router.js             # router por hash e guards
│       ├── routes.js             # tabela de rotas
│       ├── session.js            # sessão em localStorage
│       ├── api.js                # wrapper de fetch
│       ├── format.js             # datas, BRL, labels e escapeHtml
│       ├── domain/
│       │   ├── cpf.js
│       │   ├── validation.js
│       │   ├── request-state.js
│       │   ├── permissions.js
│       │   └── pricing.js
│       ├── data/
│       │   ├── users.js
│       │   ├── clients.js
│       │   ├── cars.js
│       │   ├── requests.js
│       │   ├── contracts.js
│       │   └── credit-contracts.js
│       └── ui/
│           ├── layout.js
│           ├── components.js
│           └── views/
│               ├── login.js
│               ├── register.js
│               ├── dashboard.js
│               ├── clients.js
│               ├── client-form.js
│               ├── profile.js
│               ├── cars.js
│               ├── car-form.js
│               ├── requests.js
│               ├── request-form.js
│               ├── request-detail.js
│               ├── contracts.js
│               ├── contract-form.js
│               ├── credit-contracts.js
│               ├── credit-contract-form.js
│               └── not-found.js
├── tests/
│   ├── cpf.test.js
│   ├── validation.test.js
│   ├── request-state.test.js
│   ├── permissions.test.js
│   └── pricing.test.js
└── docs/
    ├── adr/
    │   ├── 0001-vanilla-js-hash-router.md
    │   ├── 0002-json-server-single-dependency.md
    │   ├── 0003-demo-auth-plaintext.md
    │   └── 0004-vendored-bootstrap.md
    ├── uml/
    │   ├── use-cases.md
    │   ├── class-diagram.md
    │   ├── package-diagram.md
    │   └── component-diagram.md
    └── user-stories.md
```

---

## Instalação e execução

```bash
git clone https://github.com/fernandoleitepagani/diw-lab02.git
cd diw-lab02
npm install
npm start
```

A aplicação fica disponível em <http://localhost:3000>.

O `npm start` executa `node scripts/ensure-db.mjs` e inicia o JSON Server com
`--static public --port 3000`. Se `db.json` não existir, ele é criado a partir de
`db.seed.json`.

Para restaurar o banco ao estado inicial, pare o servidor e execute:

```bash
npm run reset
npm start
```

`db.json` é ignorado pelo Git; `db.seed.json` é a fonte versionada dos dados.

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm start` | Cria `db.json` se necessário e inicia o JSON Server na porta 3000. |
| `npm run reset` | Copia `db.seed.json` sobre `db.json`. |
| `npm test` | Executa os testes de domínio com `node --test`. |

---

## Credenciais de demonstração

Todas as contas usam a senha **`123456`**.

| Perfil | Nome | E-mail | Papel |
| --- | --- | --- | --- |
| Cliente | Ana Souza | `ana@cliente.com` | `client` |
| Cliente | Bruno Lima | `bruno@cliente.com` | `client` |
| Cliente | Carla Mendes | `carla@cliente.com` | `client` |
| Agente Locadora | Locadora Move | `locadora@move.com` | `agent` / `COMPANY` |
| Agente Banco | Banco Aurora | `banco@aurora.com` | `agent` / `BANK` |

> As senhas são texto puro apenas para demonstração acadêmica. Não use este
> modelo em produção.

---

## UML e histórias de usuário

| Documento | Conteúdo |
| --- | --- |
| [Casos de uso](docs/uml/use-cases.md) | Atores Cliente, Agente Locadora e Agente Banco; cadastro, login, gestão de clientes/carros, pedidos, análise, contratos, créditos e locação. |
| [Diagrama de classes](docs/uml/class-diagram.md) | `User`, `Client`, `Employer`, `Car`, `RentalRequest`, `Contract` e `CreditContract`, com campos e multiplicidades do código. |
| [Diagrama de pacotes](docs/uml/package-diagram.md) | Pastas reais `app`, `router`, `ui`, `domain`, `data`, `api`, `tests` e `docs`. |
| [Diagrama de componentes](docs/uml/component-diagram.md) | SPA, Router, Views, Domain, Repositories, API Client, JSON Server, `db.json` e `localStorage`, com interfaces. |
| [Histórias de usuário](docs/user-stories.md) | 47 histórias numeradas, agrupadas por ator, com critérios de aceitação e mapa de cobertura. |
| [Glossário](GLOSSARY.md) | Definições de Cliente, Agente, Locadora, Banco, Pedido, Contrato, Crédito, Proprietário, Parecer e Status. |

Os diagramas foram revisados contra o código implementado, não contra um modelo
idealizado. Quando o código expôs uma decisão diferente da modelagem inicial,
o diagrama foi atualizado e a decisão foi registrada em ADR.

---

## API local

O JSON Server expõe as coleções abaixo em `http://localhost:3000` e também serve
os arquivos estáticos de `public/`.

| Coleção | Conteúdo |
| --- | --- |
| `/users` | Contas de clientes e agentes, com papel e vínculo. |
| `/clients` | Dados cadastrais, CPF, endereço, profissão e vínculos empregatícios. |
| `/cars` | Frota, status, diária e propriedade. |
| `/rentalRequests` | Pedidos, período, total estimado, status e parecer. |
| `/contracts` | Contratos de aluguel, propriedade e crédito vinculado. |
| `/creditContracts` | Créditos concedidos por agentes bancários. |

Exemplos:

```bash
curl http://localhost:3000/cars?status=AVAILABLE
curl http://localhost:3000/rentalRequests?status=PENDING
curl http://localhost:3000/contracts?clientId=c3
```

Não há autenticação no JSON Server: qualquer cliente HTTP consegue ler e gravar
as coleções. A autorização existe apenas na SPA (ver limitações).

Os dados iniciais estão em [db.seed.json](db.seed.json). A versão de execução é
`db.json`, criada no primeiro `npm start` e ignorada pelo Git.

---

## Entregáveis do PDF

| Entrega do enunciado | Onde está satisfeita |
| --- | --- |
| **Lab02S01 — Modelagem:** casos de uso, histórias de usuário, classes e pacotes. | [Casos de uso](docs/uml/use-cases.md), [histórias](docs/user-stories.md), [classes](docs/uml/class-diagram.md) e [pacotes](docs/uml/package-diagram.md). |
| **Lab02S02 — Revisão dos diagramas + componentes + CRUD de cliente.** | Diagramas revisados em `docs/uml/`, componente em [component-diagram.md](docs/uml/component-diagram.md), CRUD em [clients.js](public/js/ui/views/clients.js), [client-form.js](public/js/ui/views/client-form.js), [profile.js](public/js/ui/views/profile.js) e [data/clients.js](public/js/data/clients.js). |
| **Lab02S03 — Revisão dos diagramas + protótipo para criar e visualizar status do pedido.** | Fluxo de pedidos em [requests.js](public/js/ui/views/requests.js), [request-form.js](public/js/ui/views/request-form.js) e [request-detail.js](public/js/ui/views/request-detail.js); estados em [request-state.js](public/js/domain/request-state.js). |
| **Revisão dos diagramas de acordo com o feedback.** | Os quatro diagramas refletem o código final; decisões e mudanças estão nos [ADRs](docs/adr/0001-vanilla-js-hash-router.md) e no histórico Git. |
| **Repositório GitHub atualizado, com modelos e código final.** | Repositório de destino: <https://github.com/fernandoleitepagani/diw-lab02>. O histórico local usa commits convencionais por etapa. |
| **Apresentação final do protótipo, comparação com os modelos e mudanças.** | Roteiro de 5 passos na seção [Demonstração](#demonstração-em-5-passos); o roteiro detalhado e os slides serão consolidados em `docs/demo-script.md` e `docs/apresentacao.md` na etapa de apresentação. |

> **Observação sobre a stack:** o enunciado cita Java/MVC. Por decisão de escopo
> documentada no [ADR 0001](docs/adr/0001-vanilla-js-hash-router.md), a entrega
> usa JavaScript puro com a mesma separação em camadas. O CRUD de clientes, o
> protótipo de pedidos e a modelagem exigida no PDF estão implementados e
> demonstráveis.

---

## Demonstração em 5 passos

Pré-requisito: `npm run reset && npm start`, banco limpo e sessão encerrada.

1. **Cliente cria o pedido.** Entre como `ana@cliente.com` / `123456`. Abra
   `Carros`, escolha o Corolla e clique em `Solicitar aluguel`. Informe retirada
   `25/11/2026`, devolução `28/11/2026` e observação opcional. Confira o total de
   **R$ 540,00** (3 diárias × R$ 180,00) e confirme. O pedido abre como
   `Pendente`.
2. **Locadora analisa.** Saia e entre como `locadora@move.com` / `123456`. Abra
   `Pedidos`, filtre por `Pendente`, abra o pedido da Ana e clique em
   `Iniciar análise`. Depois escreva um parecer e clique em `Aprovar`. O status
   passa a `Aprovado`.
3. **Cliente executa o contrato.** Entre novamente como Ana, abra `Meus pedidos`
   e o pedido aprovado. Clique em `Executar contrato`, escolha propriedade
   `Banco` e vincule o contrato de crédito aprovado `#cc1` (R$ 5.000,00 em 12
   parcelas). O contrato é criado como `Ativo`, o pedido vira `Contratado` e o
   Corolla vira `Alugado`.
4. **Banco gerencia crédito.** Entre como `banco@aurora.com` / `123456`. Abra
   `Créditos` e confira o `#cc1` aprovado da Ana. Abra o `#cc2` do Bruno, que
   está `Pendente`, e aprove-o. O status muda para `Aprovado` e o crédito fica
   elegível para um próximo contrato com propriedade `Banco`.
5. **Locadora inicia e conclui a locação.** Entre como `locadora@move.com`,
   abra `Contratos` e o contrato criado no passo 3. Clique em
   `Iniciar locação` (pedido vira `Ativo`) e depois em `Concluir locação`.
   Pedido e contrato ficam `Concluído`; o Corolla volta para `Disponível`.

---

## Testes

```bash
npm test
```

A suíte usa `node:test` e cobre apenas módulos puros de domínio:

- `tests/cpf.test.js` — validação, normalização e formatação de CPF.
- `tests/validation.test.js` — cliente, carro, pedido, contrato, crédito e
  sobreposição de datas.
- `tests/request-state.test.js` — todas as transições permitidas e proibidas.
- `tests/permissions.test.js` — papéis, propriedade e matriz de permissões.
- `tests/pricing.test.js` — diárias, total e arredondamento.

A execução atual passa com **52 testes**. Testes de DOM e E2E não fazem parte
desta entrega; o roteiro manual será consolidado na etapa de apresentação.

---

## Limitações conhecidas

- **Autenticação de demonstração:** senhas em texto puro em `db.seed.json` e
  comparação direta no navegador. É aceitável apenas para o laboratório.
- **Autorização somente no cliente:** roteador, views e domínio bloqueiam ações,
  mas o JSON Server não valida nada. Qualquer chamada HTTP direta pode ler ou
  gravar as coleções.
- **JSON Server local:** não há deploy público nem banco de dados real; os dados
  ficam em `db.json` no computador.
- **Fluxos de contrato não atômicos:** criar contrato, atualizar pedido e
  atualizar carro são três chamadas separadas. Se uma falhar depois das
  anteriores, as escritas já feitas não são revertidas.
- **Sem processamento de pagamento:** valores são estimativas e registros
  acadêmicos; nenhuma cobrança, boleto ou transação financeira é executada.
- **Sem validação server-side:** as regras de `domain/validation.js` rodam no
  navegador. O JSON Server aceita payloads fora das regras se chamado
  diretamente.

---

## Documentação e decisões

- [ADR 0001 — JavaScript puro com router por hash](docs/adr/0001-vanilla-js-hash-router.md)
- [ADR 0002 — JSON Server como única dependência](docs/adr/0002-json-server-single-dependency.md)
- [ADR 0003 — Autenticação demo com senhas em texto puro](docs/adr/0003-demo-auth-plaintext.md)
- [ADR 0004 — Bootstrap vendorizado](docs/adr/0004-vendored-bootstrap.md)
- [Glossário do domínio](GLOSSARY.md)
- [Histórias de usuário](docs/user-stories.md)

---

## Licença

Projeto acadêmico desenvolvido para a PUC Minas. Não há licença de distribuição
definida.
