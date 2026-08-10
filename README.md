# Finanza — Controle Financeiro Pessoal

Front-end React + Vite consumindo uma API própria (Node/Express + Prisma).

## Estrutura

```
controle-financeiro/
├── src/            # Front-end (React + Vite + Tailwind)
├── server/         # Back-end (Express + Prisma + SQLite)
└── README.md
```

## Rodando o projeto (dev)

Duas aplicações, dois terminais.

### 1. Back-end (API)

```bash
cd server
npm install
cp .env.example .env        # ajuste se necessário
npm run prisma:migrate       # cria o banco SQLite local (dev.db) e aplica o schema
npm run dev                  # http://localhost:4000
```

### 2. Front-end

```bash
npm install
cp .env.example .env         # VITE_API_URL já aponta para http://localhost:4000
npm run dev                  # http://localhost:5173
```

Abra `http://localhost:5173`. Sem conta ainda? Use "Criar uma conta" — o registro já
é real (senha com hash bcrypt, sessão via cookie httpOnly, categorias padrão
criadas automaticamente).

## Testes do back-end

```bash
cd server
npm test
```

Cobre registro, login (credenciais inválidas, e-mail inexistente sem
vazar qual dos dois falhou), sessão via `/auth/me`, logout, troca de senha e o
teste crítico de **isolamento entre usuários** (o cookie de um usuário nunca
retorna dados de outro).

## Status atual (Fase 1 do back-end)

O que já é real, persistido em banco e testado:

- Cadastro, login, logout, sessão (`/auth/me`), atualização de perfil e troca
  de senha.
- Isolamento por usuário: toda consulta usa o `userId` extraído do JWT
  (cookie httpOnly), nunca um valor vindo do cliente.
- Categorias padrão + configurações (`investment_percentage`) criadas
  automaticamente no cadastro, dentro de uma transação de banco.
- Recuperação de senha (`/auth/forgot-password` + `/auth/reset-password`):
  o mecanismo (token de uso único, hash, expiração) é real; como não há um
  provedor de SMTP configurado nesta etapa, o "envio" é um log no console do
  servidor (`[password-reset] Link para ...`) — ver `server/src/services/auth.service.ts`.

O que **ainda é mock** no front-end (fica em memória do navegador, some ao
recarregar a página) — entra na próxima fase, quando ganha endpoints e tabelas
próprias no banco (`Transaction`, `RecurringTransaction`, já modeladas no
Prisma schema, só não expostas por rota ainda):

- Lançamentos (criar/editar/excluir), categorias personalizadas, percentual
  de investimento exibido no dashboard, e os totais/gráfico da Visão Geral.

## Banco de dados

SQLite em desenvolvimento (`server/prisma/dev.db`, arquivo local, zero
instalação). O schema (`server/prisma/schema.prisma`) foi desenhado para ser
portável para PostgreSQL/Supabase sem reescrita: sem `enum` nativo do
Prisma (o conector SQLite não suporta), IDs gerados pelo Prisma Client
(`cuid()`, não uma função do banco), valores monetários em centavos
(`Int`, nunca float) e nenhum atributo `@db.*` específico de provider.

Para migrar para PostgreSQL: troque `provider = "sqlite"` por
`provider = "postgresql"` e `DATABASE_URL` no `.env` do `server/`, depois
rode `npm run prisma:deploy`.

## Segurança implementada nesta fase

- Senhas com hash `bcrypt` (nunca texto puro, nunca retornadas pela API).
- Sessão via JWT em cookie `httpOnly` + `SameSite=Lax` (não acessível por
  JavaScript no navegador).
- `userId` sempre extraído do token verificado no servidor — nunca de um
  campo enviado pelo cliente.
- Rate limiting nas rotas de autenticação (mitiga brute force).
- `helmet` (headers de segurança), CORS restrito à origem do front-end,
  erros padronizados sem stack trace/detalhes internos em produção.
- Segredos (JWT, connection string) só em variáveis de ambiente — nunca no
  código ou no front-end. Veja `server/.env.example`.
