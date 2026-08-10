-- O Supabase habilita Row Level Security por padrão em toda tabela nova do
-- schema public, mesmo sem nenhuma política criada. Isso é o comportamento
-- certo para as 7 tabelas financeiras (a migration anterior já cobre essas
-- com política + FORCE), mas é o comportamento ERRADO para `users` e
-- `password_reset_tokens`: essas duas não têm isolamento por linha — o
-- isolamento delas vem de terem um role dedicado (`app_system`) com acesso
-- exclusivo, e as próprias consultas de login/registro precisam enxergar
-- todas as linhas (para checar unicidade de e-mail, por exemplo).
--
-- RLS habilitada sem nenhuma política faz o Postgres negar TODA leitura e
-- escrita para qualquer role que não seja o dono da tabela — o que quebraria
-- login e registro por completo. Desligar aqui é intencional e necessário.
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" DISABLE ROW LEVEL SECURITY;
