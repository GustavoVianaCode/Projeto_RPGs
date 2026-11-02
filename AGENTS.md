# Regras de Desenvolvimento do Projeto (AGENTS.md)

Este documento dita os padrões obrigatórios para qualquer agente trabalhando nesta base de código.

## 1. Comunicação e Código
- **Idioma das explicações:** Português, direto ao ponto e sem enrolação.
- **Idioma do código:** Inglês (nomes de variáveis, funções, classes, arquivos, commits e documentação técnica).
- **TypeScript:** Modo estrito (`strict: true`), sem uso indevido de `any` ou `unknown` sem type guards.
- **Simplicidade:** Não adicionar bibliotecas pesadas ou camadas desnecessárias sem justificativa técnica.

## 2. Regras de Segurança e Banco de Dados

### 2.1. Anti-IDOR (Multi-tenancy Mandatório)
- Qualquer consulta que busque uma entidade vinculada a um mundo DEVE filtrar por `id` E `worldId`:
  ```typescript
  where: { id: cardId, worldId }
  ```
- Nunca confiar apenas no `id` de rotas parametrizadas.

### 2.2. Autenticação e Sessões
- `refreshToken` NUNCA é salvo em texto puro. Deve ser salvo como hash SHA-256.
- A cada uso do refresh token, rotacionar imediatamente (deletar a sessão atual e emitir novo par).
- `passwordHash` é opcional no modelo de usuário para suportar contas puras de OAuth.
- Sempre manter modelos dedicados para tokens temporários (`EmailVerificationToken`, `PasswordResetToken`).

### 2.3. Hierarquia e Regras de Cards
- Um card pode pertencer a uma pasta OU ser filho de outro card, NUNCA os dois ao mesmo tempo.
- Manter constraint no PostgreSQL:
  ```sql
  CHECK (("folderId" IS NULL AND "parentCardId" IS NOT NULL) OR ("folderId" IS NOT NULL AND "parentCardId" IS NULL) OR ("folderId" IS NULL AND "parentCardId" IS NULL))
  ```
- Validação em serviço para impedir ciclos de parentesco (`A -> B -> A`).
- Soft-delete padronizado com `deletedAt DateTime?` com efeito em cascata nos cards filhos.

### 2.4. Menções e Filas (BullMQ)
- O editor enfileira apenas o par identificador: `{ worldId, cardId }`.
- O worker carrega o documento mais recente diretamente do Postgres.
- Não colocar payloads pesados como `contentJson` no Redis.
- Não usar `jobId` estático que impeça o processamento de atualizações sequenciais legítimas.

### 2.5. Workspace Privado (Foco do Projeto)
- O projeto é um workspace estritamente privado (sem Wiki Pública e sem Mapas/Zonas).
- Roadmap futuro: Linhas do Tempo -> Grafos/Árvores -> Dicionários/Exportação.


### 2.6. Convites (`Invitation`)
- Restrição única em `[worldId, email]`.
- Conter `invitedById` e `acceptedAt`.
- É estritamente proibido criar convites com papel `OWNER`.

### 2.7. Sincronização e Triggers
- Trigger de busca em `documents` só executa quando `plainText` mudar (`WHEN (OLD."plainText" IS DISTINCT FROM NEW."plainText")`).
- Hocuspocus: Utilizar assinatura `TiptapTransformer.fromYdoc(document, 'default')`.

