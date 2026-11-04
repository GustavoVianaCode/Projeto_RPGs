# Plataforma de Worldbuilding (worldbuilding-platform)

Workspace privado, imersivo e de alta fidelidade editorial para autores de ficção e mestres de RPG organizarem lore, cronologias, referências cruzadas e documentos colaborativos em tempo real. Inspirado na qualidade de acabamento da vvd.world, o projeto é desenhado para o uso pessoal e privado: escrever lore, relacionar conceitos, buscar rapidamente qualquer registro e acompanhar cronologias históricas.

> **Escopo e Limites do Workspace:**
> Este é um workspace **estritamente privado**. O projeto não implementa Wiki Pública, Mapas/Zonas ou publicação aberta, focando na excelência de organização, escrita, busca, relações e linhas do tempo.

O projeto é estruturado como um monorepo gerenciado por **Turborepo** e **pnpm Workspaces**, com backend em **NestJS**, frontend em **React + Vite + TipTap**, persistência via **PostgreSQL 16** e **Prisma ORM**, cache e filas com **Redis 7** e sincronização de documentos via **CRDTs (Yjs)** e **Hocuspocus Server**.

---

## 📋 Pré-requisitos

Certifique-se de ter instalado em sua máquina:

- **Node.js**: Versão `20.x` ou `22.x` (LTS recomendada).
- **pnpm**: Versão `10.x` (o projeto utiliza `pnpm@10.34.4`).
- **Docker & Docker Compose**: Para orquestração dos serviços locais (PostgreSQL 16 e Redis 7).
- **Git**: Para versionamento e controle de código.

---

## 🚀 Setup e Execução (Passo a Passo)

### 1. Clonar o Repositório e Instalar Dependências

```bash
git clone <URL_DO_REPOSITORIO>
cd Projeto_RPGs
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` na raiz do projeto e sincronize com os pacotes internos:

```bash
# Na raiz:
cp .env.example .env

# Sincronizar nos pacotes da API e do banco:
cp .env.example apps/api/.env
cp .env.example packages/database/.env
```

### 3. Subir a Infraestrutura (PostgreSQL e Redis)

Inicie os containers em segundo plano:

```bash
docker compose up -d
```

Verifique se os serviços estão ativos:

```bash
docker compose ps
```

### 4. Executar as Migrações do Banco de Dados

Aplique as migrações no PostgreSQL e gere os tipos do Prisma Client:

```bash
# Aplica as migrations
pnpm db:migrate

# Gera o Prisma Client atualizado
pnpm db:generate
```

*(Opcional)* Para abrir a interface web do banco de dados:

```bash
pnpm db:studio
```
Acesse o Prisma Studio em [http://localhost:5555](http://localhost:5555).

### 5. Iniciar o Ambiente de Desenvolvimento

Para rodar todo o ecossistema com hot-reload ativo (Frontend, API e Hocuspocus Server):

```bash
# Executa todos os apps via Turborepo
pnpm dev
```

Ou execute separadamente se preferir:

```bash
# Terminal 1 — Backend API & Servidor Hocuspocus:
pnpm --filter @proj/api dev

# Terminal 2 — Frontend Workspace (Vite):
pnpm --filter @proj/app dev
```

Acessos:
- **Workspace Web (Frontend):** [http://localhost:3000](http://localhost:3000) (ou porta informada pelo Vite)
- **API REST:** [http://localhost:4000](http://localhost:4000)
- **Hocuspocus WebSocket:** `ws://localhost:4001`

---

## 🛡️ Proteção de Dados, Backups e Recuperação

O projeto possui comandos dedicados para proteger sua lore com backups consistentes do PostgreSQL:

### Criar Backup do Banco de Dados

Gera um arquivo `.dump` binário com compactação na pasta `backups/`:

```bash
pnpm db:backup
```

Ou via script manual com PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/backup.ps1
```

### Restaurar Backup

Para restaurar um backup existente (substituindo pelo snapshot escolhido):

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/restore.ps1 -BackupFile ./backups/worldbuilding_backup_YYYYMMDD_HHMMSS.dump
```

Além disso, o workspace conta com **Checkpoints de Versão** diretamente na interface para cada card:
- Criação de pontos de restauração manuais a qualquer momento.
- Ao restaurar uma versão no editor, um backup de segurança do estado atual é criado automaticamente antes da reversão para impedir perda de dados.

---

## 📁 Estrutura do Monorepo

```text
Projeto_RPGs/
├── apps/
│   ├── api/                  # Backend REST + Hocuspocus Server (NestJS 10)
│   │   ├── src/
│   │   │   ├── auth/         # Autenticação JWT com Refresh Tokens em SHA-256
│   │   │   ├── worlds/       # Gerenciamento de mundos e membros (Anti-IDOR)
│   │   │   ├── folders/      # Pastas aninhadas com prevenção de ciclos
│   │   │   ├── cards/        # Cards de lore com CTE recursivo e soft-delete
│   │   │   ├── realtime/     # Hocuspocus Provider e Workers de Menções (BullMQ)
│   │   │   ├── search/       # Busca full-text ponderada e trigramas (pg_trgm)
│   │   │   ├── timelines/    # Módulo de Linhas do Tempo e Eventos Históricos
│   │   │   └── versions/     # Histórico de Checkpoints e Restauração de versões
│   │   └── test/             # Testes de integração
│   │
│   └── app/                  # Frontend SPA com visual editorial vvd.world
│       ├── src/
│       │   ├── components/   # WorldEditor, Sidebar, CmdkSearch, Timelines, Referências, Versões
│       │   ├── extensions/   # Extensões TipTap (Mention, Spoiler, HiddenBlock)
│       │   ├── hooks/        # Hooks reativos (useSidebarTree, useSearch)
│       │   └── styles/       # Estilização editorial escura com suporte a reduced-motion
│
├── packages/
│   ├── database/             # Schema centralizado Prisma e migrações SQL
│   └── shared/               # Tipos compartilhados e extratores de texto/menções
│
├── docs/                     # Registro de decisões arquiteturais
├── scripts/                  # Scripts de automação de backup e restore
├── docker-compose.yml        # PostgreSQL 16 e Redis 7
├── AGENTS.md                 # Diretrizes e regras inegociáveis de desenvolvimento
└── package.json              # Scripts raiz do workspace
```

---

## 🛠️ Comandos Principais

| Comando | Descrição |
| :--- | :--- |
| `pnpm dev` | Inicia Frontend, API e Hocuspocus em modo watch |
| `pnpm build` | Compila todos os pacotes e aplicações (`turbo run build`) |
| `pnpm lint` | Validação estrita de tipos TypeScript sem emitir arquivos (`tsc --noEmit`) |
| `pnpm test` | Executa a suíte de testes unitários em todos os pacotes |
| `pnpm db:migrate` | Executa migrações pendentes no PostgreSQL |
| `pnpm db:generate` | Regenera artefatos tipados do Prisma Client |
| `pnpm db:backup` | Cria backup compactado do banco de dados na pasta `backups/` |
| `pnpm db:restore` | Restaura um arquivo `.dump` para o banco de dados |
