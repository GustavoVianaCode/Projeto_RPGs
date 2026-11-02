# Decisões de Arquitetura e Roadmap

Este documento consolida as decisões tomadas para a plataforma de worldbuilding voltada a autores de ficção e mestres de RPG.

## Contexto
- **Desenvolvedor:** Solo Full-Stack (foco Front-End, domínio de React, Vue, TS, Node/NestJS).
- **Abordagem:** Simplicidade primeiro, sem over-engineering, código limpo, tipado e com proteção contra débito técnico.

---

## Regras Arquiteturais Inegociáveis

1. **Fila de Menções:**
   - O editor enfileira apenas `{ worldId, cardId }`.
   - O worker busca o documento atualizado diretamente do banco de dados.
   - O payload do Redis não deve receber `contentJson`.
   - O `jobId` não deve ser estático a ponto de descartar jobs necessários (utilizar debounce por delay dinâmico ou rate-limit).

2. **Wiki Pública (Sanitização Estrita por Allow-list):**
   - Conteúdo oculto nunca é enviado ao cliente (purga no AST/JSON antes da serialização ou renderização HTML/ISR).
   - Nada de texto oculto em `plainText` público, `CardMention.contextText`, backlinks, tags `og:*`, `summary`, sitemap ou payload do Next.js.
   - Teste automatizado obrigatório com marcador `"SEGREDO123"` validando que qualquer vazamento quebre os testes.
   - Menções a cards restritos ou ausentes da wiki degradam graciosamente para texto simples.

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

---

## Fase 1 Revisada (MVP em 10–12 semanas)

### Fase 1A: Fundação, Workspace & Editor (5–6 semanas)
- Monorepo Turborepo com pnpm (`apps/web`, `apps/api`, `packages/database`, `packages/types`).
- Docker Compose com PostgreSQL 16 (`unaccent`, `pg_trgm`) e Redis 7.
- Auth: Email/Senha + OAuth, Refresh Token criptografado com rotação, verificação de email e reset de senha.
- Mundos e Membros: CRUD com papel `OWNER` atribuído ao criador, convites com token.
- CardTypes e Subtipos: tipos customizáveis (`parentId`), propriedades dinâmicas e templates.
- Pastas e Cards: pastas aninhadas com drag-and-drop, cards com constraint `folderId XOR parentCardId`, soft-delete com `deletedAt`.
- Upload de Mídia: Cloudflare R2 via presigned URLs e registro em `MediaAsset`.
- Workspace Shell: Sistema de abas e painéis lado a lado, suporte a i18n (`pt-BR` e `en`) desde a raiz.
- Editor Core: TipTap com persistência Yjs/Hocuspocus (single-user no MVP).

### Fase 1B: Inteligência, Busca, Histórico e Wiki (5–6 semanas)
- Menções `@`: Popover de link rápido no editor, trigger de indexação assíncrona leve.
- Busca Global `Cmd+K`: Full-text search no Postgres ponderado (A: title, B: summary, C: plainText) tolerante a erros e sem acentos.
- UI de Histórico de Versões: Checkpoints e visualização de revisões anteriores.
- Wiki Pública (`/w/[slug]`): SSR/ISR mobile-first com sanitização estrita (zero vazamento de ocultos) e teste com "SEGREDO123".
- DevOps e Backups: CI no GitHub Actions, deploy Docker no Coolify e backup automatizado do PostgreSQL para o Cloudflare R2.
