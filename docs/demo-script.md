# Roteiro de demonstração — 5 a 7 minutos

Demonstração ao vivo do Sistema de Aluguel de Carros. O roteiro usa apenas
dados semeados e ações de interface; não é necessário editar `db.json` à mão.

**Duração alvo:** 6 min 20 s (margem de 5–7 min).
**Aplicação:** <http://localhost:3000>
**Banco:** `db.seed.json`, restaurado com `npm run reset`.

> Os IDs de pedidos, contratos e créditos criados durante a demo são gerados
> pelo JSON Server. Sempre leia o ID na barra de endereço ou na coluna
> "Pedido"/"Contrato" em vez de digitá-lo. Os IDs semeados usados abaixo são
> fixos: `r1`, `r3`, `ct2`, `cc3`, `car1`, `car3`.

---

## Preparação (0:00–0:30)

1. No terminal, dentro de `DIW-LAB02`:

   ```bash
   npm run reset
   npm start
   ```

   **Resultado esperado:** `Reset db.json from db.seed.json` e o JSON Server
   ouvindo em <http://localhost:3000>.

2. Abra <http://localhost:3000> em uma janela anônima (sessão vazia).
   **Resultado esperado:** redirecionamento para `#/login`, título "Entrar" e
   navbar com "Entrar" e "Cadastrar".

3. Deixe a tabela de credenciais visível:

   | Perfil | E-mail | Senha | ID semeado |
   | --- | --- | --- | --- |
   | Cliente — Ana Souza | `ana@cliente.com` | `123456` | `c1` |
   | Cliente — Carla Mendes | `carla@cliente.com` | `123456` | `c3` |
   | Cliente — Bruno Lima (histórico) | `bruno@cliente.com` | `123456` | `c2` |
   | Agente Locadora — Locadora Move | `locadora@move.com` | `123456` | `u4` |
   | Agente Banco — Banco Aurora | `banco@aurora.com` | `123456` | `u5` |

   > Fale: "As senhas são de demonstração, em texto puro, e isso está
   > documentado no ADR 0003."

---

## 1. Ana cria, edita e cancela um pedido (0:30–1:30)

**Objetivo:** mostrar o CRUD do cliente e a máquina de estados no lado do
cliente.

1. Entre com `ana@cliente.com` / `123456`.
   **Esperado:** dashboard com "Olá, Ana Souza!" e badge "Cliente".

2. Clique em **Carros** na navbar.
   **Esperado:** "Carros disponíveis" com apenas os carros `AVAILABLE`:
   Toyota Corolla, Honda Civic e Chevrolet Onix. O Jeep Compass (`RENTED`) e o
   Hyundai HB20 (`MAINTENANCE`) não aparecem.

3. No card do **Toyota Corolla**, clique em **Solicitar aluguel**.
   **Esperado:** URL `#/requests/new?car=car1`; o select "Carro" já vem com
   "Toyota Corolla — ABC1D23 — R$ 180,00/dia".

4. Preencha **Data de retirada** `25/11/2026`, **Data de devolução**
   `28/11/2026` e **Observações** "Viagem de trabalho".
   **Esperado:** resumo com `3 diária(s)` e **R$ 540,00**.

5. Clique em **Solicitar aluguel**.
   **Esperado:** toast "Pedido solicitado com sucesso."; URL
   `#/requests/<novo-pedido>`; título "Pedido #<novo-pedido> **Pendente**";
   total estimado R$ 540,00; observação "Viagem de trabalho".

6. Clique em **Editar pedido**. Troque a devolução para `29/11/2026` e clique
   em **Salvar alterações**.
   **Esperado:** resumo `4 diária(s)` e R$ 720,00 antes de salvar; depois,
   detalhe com período 25/11/2026 a 29/11/2026, total R$ 720,00 e toast
   "Pedido atualizado com sucesso.".

7. Clique em **Cancelar pedido** e confirme a caixa do navegador.
   **Esperado:** toast "Pedido cancelado com sucesso."; badge **Cancelado**;
   o card de ações mostra "Nenhuma ação disponível para este pedido.".

8. Clique em **Sair** no canto superior direito.
   **Esperado:** volta para `#/login`.

> Ponto de fala: o cliente só edita/cancela enquanto o domínio permite; os
> botões somem quando o estado não permite a ação.

---

## 2. Locadora Move analisa o pedido `r1` (1:30–2:20)

**Objetivo:** mostrar `PENDING → UNDER_REVIEW → APPROVED` e o parecer.

1. Entre com `locadora@move.com` / `123456`.
   **Esperado:** dashboard "Olá, Locadora Move!" com badge
   "Agente · Locadora" e navbar com Clientes, Carros, Pedidos e Contratos.

2. Clique em **Pedidos**.
   **Esperado:** "Pedidos de aluguel" com todos os pedidos e o filtro
   "Filtrar por status". O pedido `#r1` (Ana Souza, Toyota Corolla) está
   **Pendente**.

3. No filtro, escolha **Pendente**.
   **Esperado:** a lista mostra apenas `#r1` — o pedido que Ana acabou de
   cancelar não aparece. A linha de `#r1` mostra
   `10/11/2026 a 15/11/2026`, `R$ 900,00` e **Pendente**.

4. Clique em **Analisar** na linha de `#r1`.
   **Esperado:** detalhe "Pedido #r1 **Pendente**" e o texto "Inicie a análise
   para liberar a aprovação ou a rejeição do pedido.".

5. Clique em **Iniciar análise**.
   **Esperado:** badge **Em análise**; toast "Pedido enviado para análise.";
   aparece o campo "Parecer da análise" com os botões **Aprovar** e
   **Rejeitar**.

6. Escreva o parecer "Renda compatível com o aluguel solicitado." e clique em
   **Aprovar**.
   **Esperado:** badge **Aprovado**; toast "Pedido aprovado com sucesso."; o
   parecer aparece em "Parecer da análise"; o card de ações mostra "Nenhuma
   ação de análise disponível neste status.".

7. Clique em **Sair**.
   **Esperado:** volta para `#/login`.

---

## 3. Carla executa o contrato do Onix com crédito e propriedade Banco (2:20–3:20)

**Objetivo:** mostrar `APPROVED → CONTRACTED`, a escolha de propriedade
`BANK` e o vínculo com o contrato de crédito aprovado `cc3`.

1. Entre com `carla@cliente.com` / `123456`.
   **Esperado:** dashboard "Olá, Carla Mendes!" e badge "Cliente".

2. Clique em **Meus pedidos**.
   **Esperado:** "Meus pedidos" com `#r3` (Chevrolet Onix) **Aprovado** e
   `#r4` (Jeep Compass) **Ativo**. Nenhum pedido de outro cliente aparece.

3. Na linha de `#r3`, clique em **Ver**.
   **Esperado:** "Pedido #r3 **Aprovado**"; total R$ 360,00; parecer
   "Aprovado após análise de renda."; botão **Executar contrato** visível
   apenas para a cliente dona do pedido.

4. Clique em **Executar contrato**.
   **Esperado:** URL `#/contracts/new?request=r3`; cabeçalho
   "Executar contrato"; cliente "Carla Mendes"; carro
   "Chevrolet Onix — GHI3J45"; pedido `#r3`; período 20/11/2026 a 23/11/2026;
   total R$ 360,00; select de propriedade com "Locadora" selecionado
   (valor atual do carro); select de crédito com a opção
   "Contrato #cc3 — R$ 8.000,00 em 24 parcelas".

5. Em **Propriedade do veículo**, escolha **Banco**. Em seguida, em
   **Contrato de crédito (opcional)**, escolha o **Contrato #cc3**.
   **Esperado:** o texto de apoio passa a dizer "A propriedade Banco exige a
   seleção de um contrato de crédito aprovado.".

6. Clique em **Executar contrato**.
   **Esperado:** toast "Contrato executado com sucesso."; URL
   `#/contracts/<novo-contrato>`; título
   "Contrato #<novo-contrato> **Ativo**"; pedido `#r3` com badge
   **Contratado**; propriedade **Banco**; contrato de crédito `#cc3`
   **Aprovado**, "Banco Aurora · R$ 8.000,00 em 24 parcelas".

   **Estado no banco (opcional, para quem quiser conferir):**
   `r3.status = CONTRACTED`, `car3.status = RENTED`,
   `car3.ownerType = BANK`, `car3.ownerId = u5`.

7. Clique em **Sair**.
   **Esperado:** volta para `#/login`.

---

## 4. Banco Aurora cria e aprova um contrato de crédito (3:20–4:20)

**Objetivo:** mostrar o fluxo do agente bancário, com criação em `PENDING` e
aprovação posterior.

1. Entre com `banco@aurora.com` / `123456`.
   **Esperado:** dashboard "Olá, Banco Aurora!" com badge "Agente · Banco" e
   navbar com Clientes, Pedidos, Contratos e Créditos.

2. Clique em **Créditos**.
   **Esperado:** "Contratos de crédito" com `cc3`, `cc2` (Pendente) e `cc1`;
   o botão "Novo contrato de crédito" está disponível apenas para o banco.

3. Clique em **Novo contrato de crédito**.
   **Esperado:** "Novo contrato de crédito"; banco "Banco Aurora"; aviso de
   que o contrato será criado como **Pendente**.

4. Selecione a cliente **Ana Souza — CPF 529.982.247-25**; informe valor
   `6000`, parcelas `18` e juros `1.4`. Clique em **Criar contrato**.
   **Esperado:** toast "Contrato de crédito criado como pendente."; volta
   para a lista; nova linha "#<novo-crédito> Ana Souza · Banco Aurora ·
   R$ 6.000,00 · 18 · 1.4% · **Pendente**", com ação **Analisar**.

5. Na nova linha, clique em **Analisar**.
   **Esperado:** "Revisar contrato de crédito" com o status **Pendente**.

6. No select **Status**, escolha **Aprovado** e clique em **Salvar contrato**.
   **Esperado:** toast "Contrato de crédito aprovado com sucesso."; lista com
   a linha em **Aprovado** e ação **Editar**.

7. Clique em **Sair**.
   **Esperado:** volta para `#/login`.

> Ponto de fala: o contrato de crédito aprovado fica elegível para um próximo
> contrato de aluguel com propriedade Banco. O `cc3` já era aprovado e foi
> usado no passo anterior.

---

## 5. Locadora inicia e conclui a locação; o Onix volta a ficar disponível (4:20–5:40)

**Objetivo:** mostrar o ciclo operacional do contrato e a liberação do carro.

1. Entre com `locadora@move.com` / `123456` e clique em **Contratos**.
   **Esperado:** "Contratos de aluguel". A linha do contrato criado no passo 3
   aparece com Carla Mendes, Chevrolet Onix, **Ativo**. A linha `#ct1` (Carla /
   Jeep Compass) também está **Ativo** e a linha `#ct2` (Bruno / Hyundai HB20)
   está **Concluído**; na coluna Pedido, a lista mostra "Pedido arquivado"
   (sem o id do pedido). O detalhe do `ct2` mostra "Pedido arquivado (r0)".

2. Clique em **Ver** no contrato criado no passo 3.
   **Esperado:** "Contrato #<novo-contrato> **Ativo**"; pedido `#r3`
   **Contratado**; ações **Iniciar locação** e **Cancelar locação**.

3. Clique em **Iniciar locação**.
   **Esperado:** toast "Locação iniciada com sucesso."; o pedido `#r3` passa a
   **Ativo**; as ações passam a **Concluir locação** e **Cancelar locação**.

4. Clique em **Concluir locação** e confirme a caixa do navegador.
   **Esperado:** toast "Locação concluída com sucesso."; o contrato passa a
   **Concluído**; o pedido `#r3` passa a **Concluído**; o card de ações mostra
   "Este contrato não está mais ativo.".

5. Clique em **Carros**.
   **Esperado:** o Chevrolet Onix volta a **Disponível**. A tabela do agente
   não exibe proprietário; a preservação de `ownerType`/`ownerId` é conferida
   pela API:

   ```bash
   curl -s http://localhost:3000/cars/car3
   ```

   **Esperado no JSON:** `"status": "AVAILABLE"`, `"ownerType": "BANK"`,
   `"ownerId": "u5"`.

> Ponto de fala: concluir a locação atualiza três registros — pedido,
> contrato e carro. O fluxo não é atômico; se uma chamada falhar no meio, as
> anteriores não são revertidas (limitação documentada no README).

---

## 6. Contrato histórico `ct2` com pedido arquivado (5:40–6:20)

**Objetivo:** mostrar o fallback para um registro histórico cujo pedido não
existe mais.

1. Ainda como Locadora Move, abra **Contratos** e clique em **Ver** na linha
   `#ct2`.
   **Esperado:** "Contrato #ct2 **Concluído**"; na linha "Pedido", o texto
   "Pedido arquivado (r0)"; cliente Bruno Lima; carro Hyundai HB20, placa
   MNO5P67; período 01/11/2026 a 04/11/2026; total R$ 330,00; propriedade
   Locadora; nenhum `undefined` na tela.

2. No card de ações, confirme o texto
   "Pedido arquivado: não há ações disponíveis.".

   > Nota técnica: ao abrir o detalhe do `ct2`, o navegador registra um 404
   > para `GET /rentalRequests/r0` e o app registra o erro no console antes de
   > aplicar o fallback. A tela funciona; o 404 é esperado para o registro
   > histórico. Não abra o console durante a demo se isso puder distrair a
   > banca; se abrir, explique o fallback.

3. Encerre com um resumo de 10 segundos: cliente cria/edita/cancela, agente
   analisa, cliente executa contrato com propriedade e crédito, banco gerencia
   crédito, locadora inicia/conclui e libera o carro.

**Fechamento:** `git status` limpo, `npm test` com 52 testes passando e
documentação em `docs/`.

---

## Mapa rápido dos dados semeados

| Registro | Conteúdo |
| --- | --- |
| `r1` | Ana (`c1`) / Corolla (`car1`), 10–15/11/2026, R$ 900,00, **PENDING** |
| `r2` | Bruno (`c2`) / Civic (`car2`), 12–18/11/2026, R$ 1.320,00, **UNDER_REVIEW** |
| `r3` | Carla (`c3`) / Onix (`car3`), 20–23/11/2026, R$ 360,00, **APPROVED** |
| `r4` | Carla (`c3`) / Compass (`car4`), 05–09/11/2026, R$ 1.000,00, **ACTIVE** |
| `ct1` | Carla / Compass, **ACTIVE**, propriedade **BANK**, crédito `cc3` |
| `ct2` | Bruno / HB20, **COMPLETED**, pedido `r0` inexistente |
| `cc1` | Ana, R$ 5.000,00, 12 parcelas, 1,5%, **APPROVED** |
| `cc2` | Bruno, R$ 3.000,00, 6 parcelas, 1,8%, **PENDING** |
| `cc3` | Carla, R$ 8.000,00, 24 parcelas, 1,2%, **APPROVED** |

> Se qualquer passo divergir, pare a demo, rode `npm run reset && npm start` e
> recomece. Não altere o roteiro para "fazer funcionar": registre a diferença.
