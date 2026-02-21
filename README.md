# Controle Financeiro

Aplicativo web para planejamento e controle de despesas domésticas, com UI/UX simples e 100% baseada em shadcn/ui.

## Funcionalidades Principais
- Controle focado em um único usuário/conta.
- Visão mensal (orientada ao futuro) com saldo projetado.
- Separação clara entre despesas à vista e pagas em cartão.
- Lançamento inteligente de transações no cartão sem duplicidade de gastos no mês.
- Projeção de 6 meses futuros.
- Receitas recorrentes e despesas recorrentes (templates) geradas automaticamente.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (Auth + Banco de Dados + RLS)

## Setup do Supabase e Banco de Dados

1. Acesse o [Supabase](https://supabase.com) e crie um novo projeto.
2. Em `Project Settings > API`, você encontrará as chaves `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Vá ao `SQL Editor` no Supabase, copie o conteúdo do arquivo `supabase.sql` que está na raiz deste projeto e execute.
   Isso criará as tabelas, tipos (enums), políticas de RLS e gatilhos necessários.
4. Habilite Email Auth na seção `Authentication > Providers` do painel do Supabase.

## Setup Local

1. Clone ou extraia o repositório.
2. Crie um arquivo `.env.local` na raiz com o seguinte conteúdo:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```
3. Instale as dependências:
```bash
npm install
```
4. Rode o servidor local:
```bash
npm run dev
```

## Dados de Exemplo (Seed Opcional)

Se desejar inserir dados de exemplo via SQL no Supabase, você pode rodar o seguinte após criar um usuário e copiar o ID dele:

```sql
-- Obtenha o seu user_id criado na tabela auth.users. Exemplo:
-- '12345678-abcd-1234-abcd-1234567890ab'

-- Receita recorrente
insert into public.recurring_incomes (user_id, description, amount, is_active)
values ('<SEU_USER_ID>', 'Salário', 5000.00, true);

-- Template de despesa (Aluguel dia 5)
insert into public.recurring_expense_templates (user_id, description, amount, day_of_month, is_active)
values ('<SEU_USER_ID>', 'Aluguel', 1500.00, 5, true);

-- Cartão
insert into public.cards (user_id, name, limit_amount)
values ('<SEU_USER_ID>', 'Nubank', 3000.00);
```

## Deploy na Vercel

1. Suba o código para um repositório no GitHub.
2. Acesse a [Vercel](https://vercel.com/) e importe o repositório.
3. Nas configurações de Environment Variables (Vercel > Project > Settings > Environment Variables), adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em Deploy. 🎉

## Migração para a Estrutura de Meses Customizados (v2)

Para clientes que já utilizam o sistema, é necessária uma migração estrutural para a nova versão que inclui "Mês Financeiro Customizado":

1. Acesse o **SQL Editor** do seu Supabase.
2. Copie e execute o conteúdo do arquivo `migration.sql` (encontrado na raiz deste projeto).
   - Este script fará o backup dos dados de meses passados, criará a tabela `months` e associará todas as suas despesas no histórico aos novos meses apropriados usando `month_id`.
   - O painel passará a operar inteiramente com as "Data de iníco e fim" defindas no gestor de Meses.

## Limpeza da Base de Dados (Modo DEV / Reset)

Caso deseje recomeçar do zero, limpando todos os seus registros de Cartões, Despesas, Receitas, Meses e Transações, sem afetar ou deletar sua conta de usuário (Auth):

1. Acesse o menu lateral e clique em **Configurações**.
2. Vá até a seção "Zona de Perigo (Avançado)".
3. Digite `APAGAR TUDO` e confirme.
4. **Nota de segurança:** Essa operação aciona uma função remota segura (RPC `clean_user_data` que foi instalada na migração acima) que atua rigidamente deletando registros exclusivos do usuário autenticado no momento. Use com cautela!
