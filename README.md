# Plataforma de Worldbuilding (worldbuilding-platform)

Plataforma colaborativa e modular projetada para autores de ficção e mestres de RPG gerenciarem lore, mundos, entidades, árvores hierárquicas de cards, documentos ricos com menções bidirecionais, wikis públicas e sincronização em tempo real.

O projeto é estruturado como um monorepo gerenciado por **Turborepo** e **pnpm Workspaces**, com backend em **NestJS**, persistência via **PostgreSQL 16** e **Prisma ORM**, cache e filas com **Redis 7**.

---

## 📋 Pré-requisitos

Certifique-se de ter instalado em sua máquina:

- **Node.js**: Versão `22.x` ou superior (LTS recomendada).
- **pnpm**: Versão `10.x` (o projeto utiliza `pnpm@10.34.4`).
- **Docker & Docker Compose**: Para orquestração dos serviços locais (PostgreSQL e Redis).
- **Git**: Para versionamento e controle de código.

---

## 🚀 Setup e Execução (Passo a Passo)

Siga os passos abaixo para configurar o ambiente do zero e iniciar a aplicação localmente:

### 1. Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd Projeto_RPGs
```

### 2. Instalar as Dependências

Instale todos os pacotes do monorepo através do pnpm:

```bash
pnpm install
```

### 3. Configurar as Variáveis de Ambiente

Copie o arquivo de exemplo `.env.example` para `.env` na raiz do projeto. Por conveniência para as ferramentas de build e Prisma, sincronize também nos pacotes internos:

```bash
# Na raiz do projeto:
cp .env.example .env

# Sincronizar nos pacotes da API e do banco:
cp .env.example apps/api/.env
cp .env.example packages/database/.env
```

> **Nota:** As configurações padrão no `.env.example` já estão alinhadas com as credenciais do `docker-compose.yml` (`dev_user`, `dev_password`, porta `5432` e Redis na porta `6379`).

### 4. Subir a Infraestrutura (PostgreSQL e Redis)

Inicie os containers em segundo plano:

```bash
docker compose up -d
```

Para verificar se os containers estão saudáveis:

```bash
docker compose ps
```

### 5. Executar as Migrations do Banco de Dados

Com o banco de dados ativo, aplique as migrações do Prisma e gere o Prisma Client tipado:

```bash
# Aplica as migrations pendentes no PostgreSQL
pnpm db:migrate

# Gera o Prisma Client com os tipos TypeScript
pnpm db:generate
```

*(Opcional)* Se desejar inspecionar os dados via interface visual:

```bash
pnpm db:studio
```
Acesse o Prisma Studio em [http://localhost:5555](http://localhost:5555).

### 6. Iniciar a API em Modo de Desenvolvimento

Para rodar a API com hot-reload ativo (NestJS watch mode):

```bash
# Rodar via Turborepo (a partir da raiz)
pnpm dev

# Ou rodar diretamente o workspace da API
pnpm --filter @proj/api dev
```

A API estará disponível em:
- **Base URL:** [http://localhost:4000](http://localhost:4000)

---

## 📁 Estrutura do Monorepo

O projeto adota uma arquitetura em monorepo com separação clara de responsabilidades:

```text
Projeto_RPGs/
├── apps/
│   └── api/                  # Backend REST construído com NestJS 10
│       ├── src/              # Módulos: auth, users, worlds, folders, cards, etc.
│       └── test/             # Testes de integração E2E (Jest + Supertest)
│
├── packages/
│   └── database/             # Camada de persistência compartilhada
│       ├── prisma/           # schema.prisma e histórico de migrations
│       └── src/              # Instância centralizada e exportação do PrismaClient
│
├── docs/                     # Documentação arquitetural e decisões de design
│   └── DECISIONS.md          # Registro de decisões técnicas e roadmap
│
├── AGENTS.md                 # Padrões obrigatórios de desenvolvimento e segurança
├── docker-compose.yml        # Definição dos containers de PostgreSQL 16 e Redis 7
├── package.json              # Scripts raiz e gerenciamento de ferramentas
├── pnpm-workspace.yaml       # Configuração de workspaces pnpm
└── turbo.json                # Pipeline de cache e execução de tasks do Turborepo
```

### Detalhamento dos Pacotes

- **`apps/api` (`@proj/api`)**:
  - Servidor NestJS estruturado em módulos independentes (`Auth`, `Users`, `Worlds`, `Folders`, `Cards`, `CardTypes`, `Documents`).
  - Autenticação stateless via JWT (Access Token de curta duração e Refresh Token com hash SHA-256 e rotação automática).
  - Validação estrita de DTOs (`ValidationPipe` global com `whitelist: true`).
  - Proteção anti-IDOR multi-tenant mandatória em todos os endpoints parametrizados (`where: { id, worldId }`).

- **`packages/database` (`@proj/database`)**:
  - Schema centralizado do Prisma com suporte a extensões PostgreSQL (`pg_trgm`, `unaccent`) para busca full-text performática.
  - Modelagem relacional estrita: enums para roles globais e de mundo, soft-deletes em cascata (`deletedAt`), regras de exclusividade hierárquica entre pastas e cards pais.

---

## 🛠️ Comandos Úteis

| Comando | Descrição |
| :--- | :--- |
| `pnpm install` | Instala todas as dependências do monorepo |
| `pnpm dev` | Inicia todas as aplicações em modo desenvolvimento com Turborepo |
| `pnpm --filter @proj/api dev` | Inicia especificamente a API do NestJS em modo watch |
| `pnpm build` | Compila todos os pacotes e aplicações (`turbo run build`) |
| `pnpm lint` | Executa a verificação estrita de tipagem TypeScript (`tsc --noEmit`) |
| `pnpm test` | Executa a suíte de testes unitários com Jest em todo o monorepo |
| `pnpm test:e2e` | Executa os testes de integração ponta a ponta (E2E) com banco real |
| `pnpm --filter @proj/api test:watch` | Executa os testes unitários da API no modo interativo (watch) |
| `pnpm db:migrate` | Executa as migrações de banco pendentes no Prisma (`prisma migrate dev`) |
| `pnpm db:generate` | Regenera os tipos e artefatos do Prisma Client |
| `pnpm db:studio` | Abre a interface web do Prisma Studio para manipular registros |
| `docker compose up -d` | Sobe os serviços locais (PostgreSQL 16 e Redis 7) em background |
| `docker compose down` | Encerra e remove os containers locais |
| `docker compose logs -f` | Acompanha os logs em tempo real dos serviços Docker |

---

## 🔒 Princípios e Padrões de Desenvolvimento

Antes de submeter código, consulte o arquivo [AGENTS.md](AGENTS.md) e [docs/DECISIONS.md](docs/DECISIONS.md) para garantir conformidade com as regras inegociáveis:
1. **Multi-tenancy e Anti-IDOR:** Sempre filtre consultas que busquem entidades em mundos por `id` E `worldId`.
2. **Tokens Seguros:** O `refreshToken` nunca deve ser armazenado em texto puro (utilizar hash SHA-256 e rotação a cada refresh).
3. **Hierarquia de Cards:** Um card pode pertencer a uma pasta OU ser filho de outro card, nunca ambos (assegurado por constraint `CHECK` no PostgreSQL e validação de serviço contra ciclos).
4. **TypeScript Estrito:** `strict: true` ativo em todos os pacotes, proibido uso indevido de `any` sem justificativa.

