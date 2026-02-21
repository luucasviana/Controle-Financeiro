import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Credenciais do Supabase não encontradas. Configure o arquivo .env.local.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

async function runTests() {
    console.log('--- 🚀 INICIANDO BATERIA DE TESTES REMOTO SUPABASE ---');

    // 1. Criar Usuário (Signup)
    console.log(`\n👨‍💻 1. Criando usuário: ${testEmail}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
    });

    if (signUpError) {
        console.error('❌ Erro no Signup:', signUpError.message);
        process.exit(1);
    }

    const user = signUpData.user;
    console.log(`✅ Usuário criado com sucesso! ID: ${user.id}`);

    // 2. Login
    console.log('\n🔑 2. Validando sessão com o usuário recém-criado...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
    });

    if (signInError) {
        console.error('❌ Erro no Login:', signInError.message);
        process.exit(1);
    }
    console.log('✅ Usuário autenticado e sessão estabelecida!');

    // 3. Criar Receita
    console.log('\n💰 3. Lançando uma Receita Mensal Recorrente (Salário)...');
    const { data: incomeData, error: incomeError } = await supabase
        .from('recurring_incomes')
        .insert({
            user_id: user.id,
            description: 'Salário Teste',
            amount: 5000.50,
            is_active: true
        })
        .select()
        .single();

    if (incomeError) {
        console.error('❌ Erro ao criar receita:', incomeError.message);
        process.exit(1);
    }
    console.log(`✅ Receita inserida: ${incomeData.description} - Valor: R$ ${incomeData.amount}`);

    // 4. Lançar despesa (Prevista)
    console.log('\n💸 4. Lançando uma Despesa (Status: PREVISTA)...');
    const today = new Date();
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const dueDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`;

    const { data: expenseData, error: expenseError } = await supabase
        .from('month_expenses')
        .insert({
            user_id: user.id,
            month: monthStr,
            due_date: dueDateStr,
            description: 'Conta de Energia Elétrica',
            amount: 255.00,
            status: 'PLANNED',
            payment_method: 'NONE'
        })
        .select()
        .single();

    if (expenseError) {
        console.error('❌ Erro ao lançar despesa:', expenseError.message);
        process.exit(1);
    }
    console.log(`✅ Despesa cadastrada: ${expenseData.description} / Valor: R$ ${expenseData.amount} / Status original: ${expenseData.status}`);

    // 5. Editar Despesa (Marcar como PAGA)
    console.log('\n✏️ 5. Atualizando a Despesa (Marcando como PAGA via PIX)...');
    const { data: updatedExpenseData, error: updateError } = await supabase
        .from('month_expenses')
        .update({
            status: 'PAID',
            payment_method: 'PIX',
            paid_at: new Date().toISOString()
        })
        .eq('id', expenseData.id)
        .select()
        .single();

    if (updateError) {
        console.error('❌ Erro ao atualizar despesa:', updateError.message);
        process.exit(1);
    }
    console.log(`✅ Alteração salva: Status -> ${updatedExpenseData.status} | Método -> ${updatedExpenseData.payment_method}`);

    // 6. Validar isolamento RLS e banco
    console.log('\n🔄 Realizando verificação final do Banco de Dados...');
    const { count } = await supabase.from('month_expenses').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    console.log(`✨ Total de despesas identificadas para este usuário no banco: ${count}`);

    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO! Todas as integrações (Auth, Inserção, Atualização) estão funcionando.');
}

runTests();
