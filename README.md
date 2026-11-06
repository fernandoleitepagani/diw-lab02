# DIW LAB 02 — Sistema de Aluguel de Carros

Trabalho da disciplina **Desenvolvimento de Interfaces Web** (PUC Minas).
Aplicação web para aluguel de carros, construída com JavaScript puro (ES modules),
Bootstrap 5.3 vendorizado e JSON Server para persistência local.

## Stack

- HTML, CSS e JavaScript sem framework e sem build.
- Roteamento por hash, implementado em `public/js/router.js`.
- Bootstrap 5.3.3 em `public/vendor/bootstrap/` (sem CDN).
- JSON Server 0.17.4 como única dependência de desenvolvimento.

## Como rodar

Pré-requisito: Node.js 20 ou superior.

```bash
npm install
npm start
```

A aplicação fica disponível em <http://localhost:3000>.
O script `npm start` cria `db.json` a partir de `db.seed.json` quando necessário.

Para restaurar o banco ao estado inicial:

```bash
npm run reset
```

## Estrutura

```
public/
  index.html          ponto de entrada da SPA
  css/app.css         ajustes visuais sobre o Bootstrap
  vendor/bootstrap/   Bootstrap 5.3.3 servido localmente
  js/
    app.js            composição da aplicação
    router.js         roteador por hash
    routes.js         tabela de rotas
    api.js            cliente HTTP do JSON Server
    format.js         formatação de datas, valores e rótulos
    ui/
      layout.js       navbar e estrutura da página
      components.js   componentes reutilizáveis
      views/          telas da aplicação
scripts/
  ensure-db.mjs       cria/reseta o banco local
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm start` | cria `db.json` se faltar e inicia o JSON Server na porta 3000 |
| `npm run reset` | copia `db.seed.json` sobre `db.json` |
| `npm test` | executa os testes com `node --test` |

## API local

O JSON Server expõe as coleções `users`, `clients`, `cars`, `rentalRequests`,
`contracts` e `creditContracts`.

## Limitações

Este é um projeto acadêmico. A autenticação é demonstrativa e não deve ser
usada em produção. Os dados ficam em um arquivo JSON local.
