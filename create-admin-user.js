const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://tqllergxehdowhropazj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbGxlcmd4ZWhkb3docm9wYXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU2NzIwMCwiZXhwIjoyMDUxMTQzMjAwfQ.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
);

async function createAdminUser() {
  try {
    console.log('🔄 Criando usuário admin...');
    
    // Hash da senha
    const passwordHash = await bcrypt.hash('Casc2020.', 12);
    
    // Criar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        email: 'geral.joaoecom@gmail.com',
        password_hash: passwordHash
      }])
      .select()
      .single();
    
    if (userError) {
      console.error('❌ Erro ao criar usuário:', userError);
      return;
    }
    
    console.log('✅ Usuário criado:', user.id);
    
    // Criar subscrição vitalícia
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: user.id,
        status: 'active',
        plan_type: 'lifetime',
        price_id: 'lifetime_plan',
        current_period_start: new Date().toISOString(),
        current_period_end: '2099-12-31T23:59:59Z'
      }])
      .select()
      .single();
    
    if (subError) {
      console.error('❌ Erro ao criar subscrição:', subError);
      return;
    }
    
    console.log('✅ Subscrição vitalícia criada:', subscription.id);
    console.log('🎉 Usuário admin criado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

createAdminUser();
