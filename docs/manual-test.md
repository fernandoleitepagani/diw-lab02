# Checklist de testes manuais

Use este checklist após `npm run reset && npm start`, com
<http://localhost:3000> aberto em uma janela anônima. Marque cada item apenas
depois de observar o resultado esperado.

**Dados de teste**

- Senha de todas as contas semeadas: `123456`.
- `ana@cliente.com` (`c1`), `carla@cliente.com` (`c3`),
  `bruno@cliente.com` (`c2`), `locadora@move.com` (agente `COMPANY`, `u4`),
  `banco@aurora.com` (agente `BANK`, `u5`).
- CPF válido e não usado no seed, para cadastros manuais:
  `390.533.447-05`.
- Placa de teste: `TST9A99`; matrícula: `MAT-999`.

> Para repetir o checklist do zero, pare o servidor, rode `npm run reset` e
> suba novamente com `npm start`.

---

## 1. Preparação

- [ ] `npm run reset` imprime `Reset db.json from db.seed.json`.
- [ ] `npm start` inicia o JSON Server em <http://localhost:3000> sem erro.
- [ ] Abrir `http://localhost:3000` sem sessão redireciona para `#/login`.
- [ ] A navbar mostra "Entrar" e "Cadastrar" quando não há sessão.
- [ ] `http://localhost:3000/users` retorna os 5 usuários do seed.
- [ ] `npm test` termina com **52 testes passando**.

---

## 2. Autenticação e sessão

- [ ] Login com `ana@cliente.com` / `123456` mostra "Olá, Ana Souza!" e badge
  "Cliente".
- [ ] Login com `locadora@move.com` mostra badge "Agente · Locadora".
- [ ] Login com `banco@aurora.com` mostra badge "Agente · Banco".
- [ ] Login com senha errada mostra "E-mail ou senha inválidos." e não cria
  sessão.
- [ ] Login com e-mail desconhecido mostra a mesma mensagem genérica.
- [ ] Enviar o formulário vazio mostra "Informe e-mail e senha.".
- [ ] Recarregar a página mantém a sessão (chave `diw-lab02.session` no
  `localStorage`).
- [ ] A sessão no `localStorage` não contém `password`.
- [ ] Visitar `#/login` ou `#/register` autenticado redireciona para `#/`.
- [ ] "Sair" limpa a sessão e volta para `#/login`.
- [ ] Acessar `#/requests` sem sessão redireciona para `#/login`.
- [ ] Cadastro com e-mail já existente é bloqueado com mensagem em PT-BR.
- [ ] Cadastro com CPF inválido é bloqueado; o CPF é formatado ao sair do campo.
- [ ] Cadastro com senhas diferentes é bloqueado.
- [ ] Cadastro com mais de 3 vínculos é bloqueado.
- [ ] Cadastro válido cria usuário e cliente, faz login e abre o dashboard.

---

## 3. CRUD de clientes (agente)

- [ ] Como Locadora Move, "Clientes" lista Ana, Bruno e Carla com nome, CPF,
  profissão, e-mail e renda total.
- [ ] A busca por nome, CPF (com ou sem máscara) e e-mail filtra a tabela.
- [ ] Busca sem resultado mostra "Nenhum cliente encontrado para a busca.".
- [ ] "Novo cliente" abre o formulário com dados pessoais e vínculos.
- [ ] Cadastrar cliente com nome, CPF `390.533.447-05`, RG, endereço,
  profissão e 2 vínculos grava o registro e mostra toast de sucesso.
- [ ] Editar o cliente criado salva nome, RG, endereço, profissão e vínculos.
- [ ] Trocar o CPF do cliente para um CPF já usado (`529.982.247-25`) é
  rejeitado com "Já existe um cliente cadastrado com este CPF.".
- [ ] Excluir um cliente sem vínculos funciona e remove a linha.
- [ ] Excluir Ana (`c1`) é bloqueado com a lista de pedidos, contratos e
  créditos vinculados; a mensagem nomeia os registros.
- [ ] Excluir Carla (`c3`) também é bloqueado por pedidos/contratos/créditos.
- [ ] Agente Banco também consegue listar, criar e editar clientes.
- [ ] Cliente não vê "Clientes" na navbar e é redirecionado ao abrir
  `#/clients` diretamente.

---

## 4. Perfil do cliente

- [ ] Como Ana, "Meu perfil" mostra nome, CPF, RG, endereço, profissão,
  vínculos e renda.
- [ ] O CPF aparece formatado e não pode ser alterado.
- [ ] Editar nome, RG, endereço, profissão e vínculos salva e mostra toast.
- [ ] Adicionar um quarto vínculo é bloqueado com mensagem de limite.
- [ ] Renda negativa ou vínculo sem nome é rejeitado.
- [ ] Agente não vê "Meu perfil" e é redirecionado ao abrir `#/profile`.

---

## 5. CRUD de carros

- [ ] Como Locadora Move, "Carros" lista os 5 carros com ano, placa,
  matrícula, diária e status.
- [ ] "Novo carro" cria um carro com marca, modelo, ano, placa `TST9A99`,
  matrícula `MAT-999`, diária `130` e status `Disponível`.
- [ ] Ano fora de 1900..ano atual + 1 é rejeitado.
- [ ] Diária zero ou negativa é rejeitada.
- [ ] Campos obrigatórios vazios mostram erro por campo.
- [ ] Editar o carro criado salva as alterações.
- [ ] Excluir um carro sem pedidos/contratos funciona.
- [ ] Excluir o Corolla (`car1`) é bloqueado e a mensagem cita o pedido `#r1`.
- [ ] Excluir o Onix (`car3`) é bloqueado e a mensagem cita o pedido `#r3`.
- [ ] Como agente Banco, "Carros" é somente leitura: sem "Novo carro",
  "Editar" ou "Excluir".
- [ ] Abrir `#/cars/new` como agente Banco redireciona para `#/`.

---

## 6. Catálogo do cliente

- [ ] Como Ana, "Carros" mostra apenas Corolla, Civic e Onix (status
  `AVAILABLE`).
- [ ] Compass (`RENTED`) e HB20 (`MAINTENANCE`) não aparecem.
- [ ] Cada card mostra marca/modelo, ano, placa, diária e "Solicitar aluguel".
- [ ] "Solicitar aluguel" abre `#/requests/new` com o carro pré-selecionado.
- [ ] Um carro indisponível não pode ser selecionado no formulário de pedido.

---

## 7. Ciclo de pedidos

### Cliente

- [ ] "Novo pedido" mostra carro, datas, observações e total calculado.
- [ ] Corolla com 25/11/2026 a 28/11/2026 mostra `3 diária(s)` e R$ 540,00.
- [ ] Data de devolução anterior ou igual à retirada é rejeitada.
- [ ] Submeter sem carro é rejeitado com mensagem no campo.
- [ ] Pedido criado abre como **Pendente** e mostra o total estimado.
- [ ] "Editar pedido" aparece apenas em pedido **Pendente** do próprio cliente.
- [ ] Alterar a devolução para 29/11/2026 recalcula para R$ 720,00.
- [ ] "Cancelar pedido" pede confirmação e muda o status para **Cancelado**.
- [ ] Pedido cancelado não mostra mais "Editar" nem "Cancelar".
- [ ] "Meus pedidos" lista apenas os pedidos da cliente logada.
- [ ] Pedido de outro cliente não abre por URL direta (mensagem de permissão).

### Agente

- [ ] Como Locadora Move, "Pedidos" lista todos os pedidos com cliente, carro,
  período, total, status e ações.
- [ ] O filtro por status funciona (Pendente, Em análise, Aprovado, etc.).
- [ ] Filtro sem resultados mostra "Nenhum pedido com o status ...".
- [ ] Em `#r1` **Pendente**, "Iniciar análise" muda para **Em análise**.
- [ ] Em **Em análise**, "Aprovar" muda para **Aprovado** e grava o parecer.
- [ ] Em **Em análise**, "Rejeitar" sem parecer é bloqueado com
  "Informe o parecer para rejeitar o pedido.".
- [ ] Em **Em análise**, "Rejeitar" com parecer muda para **Rejeitado**.
- [ ] Pedido **Aprovado** mostra o parecer da análise.
- [ ] Como agente Banco, a fila de pedidos e a análise também funcionam
  (comportamento atual do código).
- [ ] Criar/editar pedido com período que se sobrepõe a um pedido
  `CONTRACTED`/`ACTIVE` do mesmo carro é bloqueado com mensagem citando o
  pedido conflitante.

---

## 8. Fluxo de contrato de aluguel

- [ ] Como Carla, o pedido `#r3` **Aprovado** mostra "Executar contrato".
- [ ] O formulário mostra cliente, carro, pedido, datas e total corretos.
- [ ] O select de propriedade oferece Cliente, Locadora e Banco.
- [ ] "Banco" sem crédito selecionado é bloqueado com
  "Para a propriedade Banco, selecione um contrato de crédito aprovado.".
- [ ] Com propriedade Banco e crédito `cc3`, o contrato é criado como
  **Ativo**, o pedido vira **Contratado** e o carro vira **Alugado**.
- [ ] O contrato mostra propriedade Banco, o crédito `#cc3` (Banco Aurora,
  R$ 8.000,00 em 24 parcelas) e status **Ativo**.
- [ ] Como Locadora Move, o contrato criado mostra "Iniciar locação".
- [ ] "Iniciar locação" muda o pedido para **Ativo** e mostra
  "Concluir locação".
- [ ] "Concluir locação" pede confirmação, muda contrato e pedido para
  **Concluído** e libera o carro como **Disponível**.
- [ ] Depois de concluir, executar `curl http://localhost:3000/cars/car3` e
  conferir `status: AVAILABLE`, `ownerType: BANK`, `ownerId: u5`.
- [ ] "Cancelar locação" em contrato `CONTRACTED`/`ACTIVE` muda contrato e
  pedido para **Cancelado** e libera o carro.
- [ ] Cliente vê apenas os próprios contratos.
- [ ] Agente Banco consegue operar contratos no código atual; confirme o
  comportamento e registre se ele for restrito no futuro.

---

## 9. Fluxo de contrato de crédito

- [ ] Como Banco Aurora, "Créditos" lista `cc3`, `cc2` e `cc1` com cliente,
  banco, valor, parcelas, juros e status.
- [ ] "Novo contrato de crédito" exibe o banco logado e exige cliente.
- [ ] Valor `0`, parcelas `0`/`61` ou juros negativo são rejeitados.
- [ ] Criar contrato para Ana com R$ 6.000,00, 18 parcelas e 1,4% grava como
  **Pendente**.
- [ ] "Analisar" abre o contrato em modo de revisão.
- [ ] Alterar o status para **Aprovado** e salvar mostra toast de aprovação.
- [ ] Alterar o status para **Rejeitado** e salvar mostra toast de rejeição.
- [ ] Como Locadora Move, "Créditos" é somente leitura (sem "Novo" nem
  "Editar"/"Analisar").
- [ ] Como cliente, "Meus contratos de crédito" lista apenas os próprios.
- [ ] Um cliente sem créditos vê "Você ainda não possui contratos de crédito.".

---

## 10. Permissões e guards

- [ ] Cliente não acessa `#/clients`, `#/clients/new` ou
  `#/clients/:id/edit` (redireciona para `#/`).
- [ ] Cliente não acessa `#/cars/new` ou `#/cars/:id/edit`.
- [ ] Cliente não acessa `#/credit-contracts/new`.
- [ ] Agente não acessa `#/profile`, `#/requests/new` ou `#/contracts/new`.
- [ ] Agente Banco não acessa `#/cars/new` nem `#/cars/:id/edit`.
- [ ] Agente Locadora não acessa `#/credit-contracts/new` nem
  `#/credit-contracts/:id/edit`.
- [ ] Agente acessa `#/requests` e vê todos os pedidos.
- [ ] Cliente acessa `#/requests/:id` de outro cliente e vê "Você não tem
  permissão para ver este pedido.".
- [ ] A navbar muda conforme o papel (Cliente, Locadora, Banco).
- [ ] Logout em qualquer tela volta para o login e limpa a sessão.

---

## 11. Validação

- [ ] CPF inválido (`111.111.111-11`) é rejeitado no cadastro e no formulário
  de cliente.
- [ ] CPF duplicado é rejeitado com "Já existe um cliente cadastrado com este
  CPF.".
- [ ] Nome, RG, endereço e profissão vazios mostram erro por campo.
- [ ] Mais de 3 vínculos empregatícios é bloqueado.
- [ ] Renda negativa é bloqueada.
- [ ] Ano do carro fora do intervalo é bloqueado.
- [ ] Diária menor ou igual a zero é bloqueada.
- [ ] Pedido sem carro ou com data final menor/igual à inicial é bloqueado.
- [ ] Abrir `#/contracts/new` sem pedido mostra "Selecione um pedido aprovado
  para executar o contrato.".
- [ ] Abrir `#/contracts/new?request=r2` (pedido Em análise) mostra "Este
  pedido não está aprovado para contratação.".
- [ ] Contrato com propriedade Banco sem crédito selecionado é bloqueado.
- [ ] Crédito com valor zero/negativo, parcelas fora de 1..60 ou juros
  negativo é bloqueado.
- [ ] Mensagens de erro aparecem em PT-BR e o botão é reabilitado após falha.

---

## 12. Estados vazios

- [ ] Busca de clientes sem resultado mostra mensagem específica.
- [ ] Filtro de pedidos sem resultado mostra "Nenhum pedido com o status ...".
- [ ] Cliente sem pedidos vê "Você ainda não fez nenhum pedido de aluguel."
  (use uma conta recém-cadastrada).
- [ ] Cliente sem contratos vê "Você ainda não possui contratos de aluguel."
  (use Ana, que não tem contrato no seed).
- [ ] Cliente sem créditos vê "Você ainda não possui contratos de crédito."
  (conta recém-cadastrada).
- [ ] Nenhum carro disponível mostra "Nenhum carro disponível no momento."
  (opcional: marque todos os carros como `MAINTENANCE`/`RENTED`).
- [ ] Nenhum cliente cadastrado mostra "Nenhum cliente cadastrado. Use
  “Novo cliente” para começar." (opcional: `clients: []` em `db.json`).
- [ ] Nenhum contrato/nenhum crédito mostra a mensagem de lista vazia
  correspondente.

---

## 13. Layout responsivo

- [ ] Em 375 px de largura, a navbar vira botão "hambúrguer" e abre/fecha o
  menu.
- [ ] Em 375 px, os cards do catálogo e do dashboard ficam em uma coluna.
- [ ] Em 375 px, tabelas largas rolam horizontalmente sem quebrar o layout.
- [ ] Em 768 px, formulários usam uma ou duas colunas e não estouram a tela.
- [ ] Em 1280 px, o conteúdo fica centralizado e legível.
- [ ] Toasts aparecem no canto inferior direito e não cobrem os botões.
- [ ] Nenhum texto fica cortado ou sobreposto nos três tamanhos.
- [ ] O foco do teclado é visível e o menu continua navegável por Tab.

---

## 14. Console do navegador

- [ ] Login, dashboard, clientes, carros, pedidos, contratos e créditos não
  geram erros inesperados no console.
- [ ] Nenhum `undefined`, `NaN` ou `[object Object]` aparece na interface.
- [ ] **Exceção conhecida:** abrir o detalhe do contrato `ct2` registra um
  `404` para `GET /rentalRequests/r0` e um `console.error` do `orFallback`.
  A tela mostra "Pedido arquivado (r0)" e não quebra. Registre o comportamento;
  não é um erro de dados do usuário.
- [ ] Se houver erro de carregamento, a tela mostra alerta em PT-BR e, quando
  aplicável, botão "Tentar novamente".

---

## 15. Registro histórico `ct2`

- [ ] Como Locadora Move, a lista de contratos mostra `#ct2` com
  "Pedido arquivado" na coluna Pedido; o detalhe mostra
  "Pedido arquivado (r0)".
- [ ] `#ct2` mostra cliente Bruno Lima, carro Hyundai HB20, período
  01/11/2026 a 04/11/2026, total R$ 330,00, propriedade Locadora e status
  **Concluído**.
- [ ] Abrir `#/contracts/ct2` mostra "Pedido arquivado (r0)" no lugar do
  pedido.
- [ ] O card de ações mostra "Pedido arquivado: não há ações disponíveis.".
- [ ] Nenhuma ação de iniciar/concluir/cancelar aparece para o `ct2`.
- [ ] Cliente Bruno vê o próprio `ct2` e o fallback, sem ações de locação.

---

## 16. Fechamento

- [ ] `git status` mostra apenas arquivos intencionais (sem `db.json`).
- [ ] `npm test` continua passando.
- [ ] O roteiro `docs/demo-script.md` roda do início ao fim após
  `npm run reset && npm start`.
- [ ] A apresentação `docs/apresentacao.md` cita apenas arquivos e
  comportamentos que existem no repositório.
