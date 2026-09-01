// ============================================================
// auth.js — login, cadastro, logout e recuperação de senha.
// Usado por index.html, cadastro-cliente.html, cadastro-prestador.html
// e esqueci-senha.html. Depende de supabase-client.js e utils.js.
// ============================================================

const Auth = {

  // Função auxiliar para obter o cliente Supabase de forma segura
  _getSupabase() {
    const client = window.supabase || window.supabaseClient;
    if (!client) {
      console.error('❌ Supabase Client não encontrado. Verifique se supabase-client.js foi carregado.');
      return null;
    }
    return client;
  },

  async login(email, senha) {
    const supabase = this._getSupabase();
    if (!supabase) {
      return { success: false, error: 'Erro de configuração. Recarregue a página.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password: senha 
      });
      
      if (error) return { success: false, error: this.traduzErro(error.message) };

      const { data: perfil, error: perfilError } = await supabase
        .from('profiles')
        .select('tipo, status')
        .eq('id', data.user.id)
        .single();

      if (perfilError || !perfil) {
        return { success: false, error: 'Não foi possível carregar seu perfil.' };
      }

      if (perfil.status === 'bloqueado') {
        await supabase.auth.signOut();
        return { success: false, error: 'Sua conta está bloqueada. Entre em contato com o suporte.' };
      }

      window.location.href = perfil.tipo === 'prestador'
        ? '../prestador/dashboard-prestador.html' // Ajuste o caminho conforme sua estrutura de pastas
        : perfil.tipo === 'admin'
          ? '../admin/dashboard.html'
          : '../cliente/dashboard-cliente.html';

      return { success: true };
    } catch (err) {
      console.error('❌ Erro no login:', err);
      return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    }
  },

  // dados = { nome, email, senha, whatsapp, cidade, bairro, cep, complemento, cpf, tipo, servicosSelecionados: [uuid,...] }
  async register(dados) {
    const supabase = this._getSupabase();
    if (!supabase) {
      return { success: false, error: 'Erro de configuração. Recarregue a página.' };
    }

    try {
      console.log('🔍 Iniciando registro com Supabase...', dados.email);

      // 1. Prepara os metadados exatamente como o TRIGGER do SQL espera
      const metaData = {
        nome: dados.nome,
        tipo: dados.tipo || 'cliente',
        whatsapp: dados.whatsapp || null,
        cidade: dados.cidade || null,
        bairro: dados.bairro || null,
        cep: dados.cep || null,
        complemento: dados.complemento || null,
        cpf: dados.cpf || null,
        // Se for prestador e tiver serviços selecionados, envia o array de UUIDs
        ...(dados.tipo === 'prestador' && dados.servicosSelecionados && dados.servicosSelecionados.length > 0 && {
          service_types: dados.servicosSelecionados
        })
      };

      // 2. Chama APENAS o signUp. 
      // O TRIGGER handle_new_user (no SQL) fará o INSERT no banco automaticamente!
      const { data, error } = await supabase.auth.signUp({
        email: dados.email,
        password: dados.senha || dados.password, // Aceita ambos os nomes de variável vindos do form
        options: {
          data: metaData
        }
      });

      if (error) {
        console.error('❌ Erro no signUp:', error);
        return { success: false, error: this.traduzErro(error.message) };
      }

      console.log('✅ Conta criada com sucesso! ID:', data.user.id);
      console.log('📝 O perfil será criado automaticamente pelo Trigger do banco de dados.');
      
      return { 
        success: true, 
        usuario: data.user,
        mensagem: data.session 
          ? 'Cadastro e perfil criados com sucesso!' 
          : 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.'
      };

    } catch (erro) {
      console.error('❌ Erro inesperado no registro:', erro);
      return { success: false, error: 'Ocorreu um erro inesperado. Tente novamente.' };
    }
  },

  async logout() {
    const supabase = this._getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('❌ Erro no logout:', err);
      }
    }
    
    const inSubfolder = /\/(cliente|prestador|admin|publico)\//.test(window.location.pathname);
    window.location.href = inSubfolder ? '../index.html' : 'index.html';
  },

  async recuperarSenha(email) {
    const supabase = this._getSupabase();
    if (!supabase) {
      return { success: false, error: 'Erro de configuração. Recarregue a página.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/index.html'
      });
      
      if (error) return { success: false, error: this.traduzErro(error.message) };
      return { success: true };
    } catch (err) {
      console.error('❌ Erro na recuperação de senha:', err);
      return { success: false, error: 'Erro ao enviar e-mail de recuperação.' };
    }
  },

  // Função auxiliar interna para traduzir erros do Supabase
  traduzErro(mensagem) {
    const mapa = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'User already registered': 'Já existe uma conta com esse e-mail.',
      'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
      'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
      'Invalid email': 'Formato de e-mail inválido.'
    };
    return mapa[mensagem] || mensagem || 'Ocorreu um erro. Tente novamente em instantes.';
  }
};

// Disponibiliza globalmente
window.Auth = Auth;

// Diagnóstico inicial
console.log('📦 Auth module carregado com sucesso!');