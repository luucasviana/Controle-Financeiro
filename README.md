# Controle Financeiro

Aplicativo web para planejamento e controle financeiro pessoal, com interface em Next.js e persistência no Supabase.

## Funcionalidades principais
- Controle focado em um único usuário.
- Meses financeiros customizados com período de início e fim.
- Receitas recorrentes, despesas recorrentes e despesas avulsas.
- Separação entre gastos à vista e consumo de cartão.
- Projeção dos próximos meses.
- Modo oculto para receitas e despesas fora do cálculo.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (Auth + Banco de Dados + RLS)

## Setup do Supabase
1. Crie um projeto no [Supabase](https://supabase.com).
2. Em `Project Settings > API`, copie:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. No `SQL Editor`, execute o conteúdo de [supabase.sql](/C:/Users/lucas/Controle%20Financeiro/supabase.sql).
   Esse arquivo já representa o schema atual esperado pela aplicação, incluindo:
   - tabela `months`
   - relacionamento `month_expenses.month_id`
   - `card_month_balances`
   - campos `is_hidden` e `is_excluded`
   - RPC `clean_user_data`
4. Habilite Email Auth em `Authentication > Providers`.

## Setup local
1. Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

2. Instale as dependências:

```bash
npm install
```

3. Rode o projeto:

```bash
npm run dev
```

## Dados de exemplo
Depois de criar um usuário no Supabase Auth, você pode inserir dados de teste:

```sql
insert into public.months (user_id, name, start_date, end_date, status)
values ('<SEU_USER_ID>', 'Maio/2026', '2026-05-01', '2026-05-31', 'OPEN');

insert into public.recurring_incomes (user_id, description, amount, is_active)
values ('<SEU_USER_ID>', 'Salário', 5000.00, true);

insert into public.recurring_expense_templates (user_id, description, amount, day_of_month, is_active)
values ('<SEU_USER_ID>', 'Aluguel', 1500.00, 5, true);

insert into public.cards (user_id, name, limit_amount)
values ('<SEU_USER_ID>', 'Nubank', 3000.00);
```

## Deploy
1. Suba o código para um repositório Git.
2. Importe o projeto na Vercel.
3. Configure as variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Faça o deploy.

## Notas sobre migrações antigas
- Os arquivos `migration.sql`, `migration_hidden_incomes.sql` e `migration_excluded_expenses.sql` são históricos e úteis só para bases antigas.
- Para uma instalação nova, use apenas `supabase.sql`.
- Se a sua base antiga ainda usa a coluna `month` em vez de `month_id`, ou não possui a tabela `months`, alinhe o banco antes de usar a versão atual do app.

## Reset de dados
Na tela de configurações existe uma ação para limpar todos os dados do usuário autenticado sem apagar a conta no Auth. Ela usa a função RPC `clean_user_data`.
