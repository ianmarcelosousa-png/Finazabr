# Conectando o Finanza a um projeto Supabase

Cinco passos. Leva uns 10 minutos, e não exige instalar nada além do que você
já tem.

---

## 1. Crie o projeto

Em [supabase.com](https://supabase.com) → **New project**. Guarde a senha do
banco que ele pedir — ela não aparece de novo.

Espere o projeto terminar de provisionar (uns 2 minutos).

---

## 2. Crie os roles da aplicação

Abra **SQL Editor** no painel do Supabase e rode o bloco abaixo, trocando as
duas senhas por valores fortes e diferentes entre si.

```sql
-- Role da aplicação: enxerga só as tabelas financeiras, SEMPRE sob RLS.
-- NOBYPASSRLS é o ponto central: sem ele, a política não vale para este role
-- e toda a proteção do banco vira decoração.
CREATE ROLE app_user LOGIN PASSWORD 'TROQUE_ESTA_SENHA_1' NOBYPASSRLS;

-- Role de autenticação: enxerga só `users` e `password_reset_tokens`.
CREATE ROLE app_system LOGIN PASSWORD 'TROQUE_ESTA_SENHA_2' NOBYPASSRLS;
```

Se você for rodar os testes automatizados, crie também o schema deles:

```sql
CREATE SCHEMA IF NOT EXISTS finance_test;
```

---

## 3. Preencha o `.env`

Copie `server/.env.example` para `server/.env` e monte as quatro URLs a partir
da connection string do painel (**Project Settings → Database**).

Use a URI da aba **Session pooler** (porta 5432) ou a **Direct connection** —
**não** a Transaction pooler (porta 6543): ela não suporta as transações
interativas que a RLS deste projeto usa.

| Variável | Usuário na URL | Para quê |
|---|---|---|
| `DATABASE_URL` | `app_user` | queries de dados financeiros (sob RLS) |
| `SYSTEM_DATABASE_URL` | `app_system` | login, registro, recuperação de senha |
| `DIRECT_URL` | `postgres` | só migrations |
| `TEST_DATABASE_URL` | `postgres` + `?schema=finance_test` | `npm test` |

Gere também um `JWT_SECRET` forte:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. Aplique o schema

```bash
npm run prisma:deploy
```

Isso cria as tabelas e, na segunda migration, **liga a RLS e distribui as
permissões** entre `app_user` e `app_system`.

---

## 5. Confirme que a RLS está de pé

```bash
npm test
```

O arquivo `tests/rls.test.ts` conecta como `app_user` e tenta, em SQL cru,
ler e gravar dados de outro usuário. Se as políticas não estiverem valendo,
esses testes falham — é a prova de que a trava existe, não só a promessa.

Você também pode conferir pelo painel: **Database → Tables**, cada uma das
sete tabelas com `user_id` deve aparecer com **RLS enabled**.

---

## O que acontece se eu pular o passo 2?

O servidor sobe assim mesmo e avisa no console:

```
[env] SYSTEM_DATABASE_URL não definido — usando DATABASE_URL para autenticação.
```

O sistema funciona e o isolamento por aplicação continua valendo (o `userId`
sempre vem do JWT). Você perde a camada extra do banco — que é justamente a
que protege contra um erro de programação. Vale os 10 minutos.
