# Decisões de Arquitetura e Roadmap

Este documento consolida as decisões tomadas para a plataforma de worldbuilding voltada a autores de ficção e mestres de RPG.

## Contexto
- **Desenvolvedor:** Solo Full-Stack (foco Front-End, domínio de React, Vue, TS, Node/NestJS).
- **Abordagem:** Simplicidade primeiro, sem over-engineering, código limpo, tipado e com proteção contra débito técnico.
- **Identidade do Produto:** Workspace estritamente privado, confiável e editorial (inspirado na qualidade e acabamento da vvd.world).

---

## Regras Arquiteturais Inegociáveis

1. **Fila de Menções:**
   - O editor enfileira apenas `{ worldId, cardId }`.
   - O worker busca o documento atualizado diretamente do banco de dados.
   - O payload do Redis não deve receber `contentJson`.
   - O `jobId` não deve ser estático a ponto de descartar jobs necessários (utilizar debounce por delay dinâmico ou rate-limit).

2. **Transição Desktop Local-First & Reorientação de Escopo:**
   - O produto evolui para um aplicativo desktop instalável (`WorldArchitect`), priorizando uso local-first, soberania de dados e ausência de cotas arbitrárias por usuário ou mundo.
   - **Revisão de Escopo:** **Mapas/Zonas** e **Wiki Privada/Local** são reincorporados ao roadmap do produto para visualização offline de lore e atlas. Permanece expressamente proibida a publicação pública aberta na web sem autorização específica.
   - **Arquitetura Desktop:** Adoção do Electron para empacotamento desktop nativo (compatível com a stack Node.js/TypeScript e sem exigência de toolchain Rust local), com orquestração automática do ciclo de vida de serviços locais via `ServiceManager`.
   - **Formato de Portabilidade:** Padronização do formato `.worldpack` (ZIP versionado com `manifest.json`, checksums SHA-256 de integridade e importação transacional atômica) independente de cópias manuais de bancos de dados.

3. **Autenticação Segura:**
   - `refreshToken` guardado apenas como hash SHA-256 e rotacionado a cada novo refresh.
   - `passwordHash` opcional para permitir contas puramente OAuth.
   - Tabelas e fluxos dedicados para verificação de e-mail e recuperação de senha.

4. **Regras de Cards:**
   - Constraint `CHECK` no PostgreSQL garantindo exclusividade: ou pertence a `folderId` ou a `parentCardId`, nunca a ambos simultaneamente.
   - Validação para impedir ciclos hierárquicos (`A -> B -> A`).
   - Soft-delete em cascata (`deletedAt`): ao deletar um card pai, os filhos são excluídos/filtrados conjuntamente.

5. **Hocuspocus & Sincronização:**
   - Uso de `TiptapTransformer.fromYdoc(document, 'default')` conforme assinatura oficial.
   - Trigger de atualização do vetor de busca em `documents` só executa quando `plainText` realmente muda (`WHEN (OLD."plainText" IS DISTINCT FROM NEW."plainText")`).
   - Versão mínima do Postgres: 14+ (alvo: PostgreSQL 16).

6. **Convites (`Invitation`):**
   - Chave única em `[worldId, email]`.
   - Registro de `invitedById` e `acceptedAt`.
   - Proibição estrita do papel `OWNER` em convites.

7. **Multi-tenancy e Proteção Anti-IDOR:**
   - Todas as queries que buscam registros por ID filtram obrigatoriamente por `worldId`.
   - Validação em cascata em relacionamentos compostos no Postgres `[id, worldId]`.

---

## Módulos Implementados

### 1. Fundação, Autenticação e Multi-tenancy
- Autenticação JWT stateless com Access Token e Refresh Token com hash SHA-256 e rotação a cada uso.
- Guard `WorldRoleGuard` com papéis `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`.
- Proteção anti-IDOR garantida no banco de dados através de chaves únicas compostas `@@unique([id, worldId])` em todas as entidades vinculadas a mundo.

### 2. Estrutura de Pastas e Cards
- Pastas aninhadas em árvore com reordenação e prevenção de ciclos hierárquicos.
- Cards com exclusividade mútua entre pertencer a pasta ou ser filho de outro card (`check_folder_xor_parent_card`).
- Prevenção de ciclos de parentesco (`A -> B -> A`) via CTE recursiva no PostgreSQL.
- Soft-delete recursivo em cascata que oculta recursivamente todos os cards descendentes.

### 3. Editor Colaborativo & Menções
- Servidor Hocuspocus integrado com autenticação JWT e validação de membership no mundo.
- Extensões TipTap customizadas (`Mention`, `Spoiler`, `HiddenBlock` para segredos de DM).
- Worker assíncrono BullMQ para extração e sincronização de menções no banco.
- Endpoint de referências cruzadas (`GET /worlds/:worldId/cards/:id/references`) com distinção de links válidos e quebrados.

### 4. Linhas do Tempo e Cronologias
- CRUD completo de Linhas do Tempo (`Timeline`) e Eventos Históricos (`TimelineEvent`).
- Suporte a calendários e datas flexíveis de worldbuilding (`dateText`).
- Associação opcional de eventos a cards de lore com navegação em 1 clique.
- Validação estrita de Anti-IDOR: rejeição imediata se um card associado pertencer a outro mundo.
- Permissões: `VIEWER` para leitura, `EDITOR` ou superior para alterações.

### 5. Histórico e Checkpoints de Versão
- Gravação de pontos de restauração manuais (`DocumentVersion`) com label opcional e snapshot do conteúdo e título.
- Consulta cronológica reversa de versões com contagem de palavras e pré-visualização.
- Restauração segura com criação automática de backup do conteúdo atual antes da reversão.
