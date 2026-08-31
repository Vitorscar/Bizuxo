// ============================================
// Cliente Supabase - OS Rápida
// ============================================

// Aguarda o DOM carregar e a biblioteca do Supabase estar disponível
(function() {
    console.log('📦 Inicializando Supabase Client...');
    
    // Configurações do Supabase
    // Substitua pelos dados do SEU projeto
    const SUPABASE_URL = 'https://fwzwiovycsphfrcfrjad.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_Rv3ia0kJOieOeSaj4sIKXg_rLl_sk9L';
    
    // Função para inicializar
    function initSupabase() {
        // Verifica se a biblioteca foi carregada
        if (!window.supabase || !window.supabase.createClient) {
            console.error('❌ Biblioteca Supabase não carregada!');
            console.log('Tentando novamente em 1 segundo...');
            setTimeout(initSupabase, 1000);
            return;
        }
        
        try {
            // Cria o cliente
            window.supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );
            
            console.log('✅ Supabase Client inicializado com sucesso!');
            console.log('🔗 URL:', SUPABASE_URL);
            
            // Dispara evento para notificar que está pronto
            window.dispatchEvent(new Event('supabase-ready'));
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            window.supabaseClient = null;
        }
    }
    
    // Inicia a inicialização
    initSupabase();
})();