

console.log('📦 Inicializando Supabase Client...');

// Verifica se a biblioteca do Supabase foi carregada
if (typeof window.supabase === 'undefined') {
  console.error('❌ Supabase JS library não foi carregada!');
  console.error('Verifique se o script do CDN está correto.');
} else {
  console.log('✅ Biblioteca Supabase encontrada!');
  console.log('🔍 Biblioteca:', window.supabase);
  console.log('🔍 Métodos disponíveis:', Object.keys(window.supabase));
  
  // Configurações do Supabase
  const SUPABASE_URL = 'https://kwshthfbhzjaxyaoiokz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_FfZrSfdOE-hqUGhBTccTIg_ww8QnWxb'; // ⚠️ SUBSTITUA!
  
  try {
    // Cria o cliente Supabase
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Disponibiliza globalmente
    window.supabase = supabaseClient;
    window.supabaseClient = supabaseClient;
    
    console.log('✅ Supabase Client inicializado com sucesso!');
    console.log('🔗 URL:', SUPABASE_URL);
    
    // Verificações importantes
    console.log('🔍 Cliente completo:', supabaseClient);
    console.log('🔍 Propriedades do cliente:', Object.keys(supabaseClient));
    console.log('🔍 auth:', supabaseClient.auth);
    console.log('🔍 auth.signUp:', supabaseClient.auth?.signUp);
    console.log('🔍 auth.signInWithPassword:', supabaseClient.auth?.signInWithPassword);
    
    // Teste de funcionalidade
    if (!supabaseClient.auth || !supabaseClient.auth.signUp) {
      console.error('❌ ERRO CRÍTICO: O cliente Supabase não tem o método auth!');
      console.error('Isso geralmente acontece quando:');
      console.error('1. A chave ANON está inválida');
      console.error('2. A URL do projeto está errada');
      console.error('3. O projeto foi pausado/excluído');
    } else {
      console.log('✅ Cliente Supabase está funcionando corretamente!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar cliente Supabase:', error);
    console.error('Detalhes:', error.message);
  }
}