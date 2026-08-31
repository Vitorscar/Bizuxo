// ============================================================
// auth.js — login, cadastro, logout e recuperação de senha.
// Usado por index.html, cadastro-cliente.html, cadastro-prestador.html
// e esqueci-senha.html. Depende de supabase-client.js e utils.js.
// ============================================================

const Auth = {

  async login(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return { success: false, error: traduzErro(error.message) };

    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('tipo, status')
      .eq('id', data.user.id)
      .single();

    if (perfilError || !perfil) return { success: false, error: 'Não foi possível carregar seu perfil.' };

    if (perfil.status === 'bloqueado') {
      await supabase.auth.signOut();
      return { success: false, error: 'Sua conta está bloqueada. Entre em contato com o suporte.' };
    }

    window.location.href = perfil.tipo === 'prestador'
      ? 'prestador/dashboard.html'
      : perfil.tipo === 'admin'
        ? 'admin/dashboard.html'
        : 'cliente/dashboard-cliente.html';

    return { success: true };
  },

  // dados = { nome, email, password, whatsapp, cidade, bairro, cep, complemento, cpf, tipo, service_types: [uuid,...] }
  async register(dados) {
    const { data, error } = await supabase.auth.signUp({
      email: dados.email,
      password: dados.password
    });
    if (error) return { success: false, error: traduzErro(error.message) };

    const { error: perfilError } = await supabase.from('profiles').insert({
      id: data.user.id,
      tipo: dados.tipo,
      nome: dados.nome,
      email: dados.email,
      whatsapp: dados.whatsapp,
      cidade: dados.cidade,
      bairro: dados.bairro,
      cep: dados.cep ?? null,
      complemento: dados.complemento ?? null,
      cpf: dados.cpf ?? null
    });
    if (perfilError) return { success: false, error: 'Conta criada, mas houve um erro ao salvar seu perfil.' };

    if (dados.tipo === 'prestador' && Array.isArray(dados.service_types) && dados.service_types.length) {
      const linhas = dados.service_types.map(serviceTypeId => ({
        provider_id: data.user.id,
        service_type_id: serviceTypeId
      }));
      await supabase.from('provider_services').insert(linhas);
    }

    return { success: true };
  },

  async logout() {
    await supabase.auth.signOut();
    const inSubfolder = /\/(cliente|prestador|admin|publico)\//.test(window.location.pathname);
    window.location.href = inSubfolder ? '../index.html' : 'index.html';
  },

  async recuperarSenha(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/index.html'
    });
    if (error) return { success: false, error: traduzErro(error.message) };
    return { success: true };
  }

};

function traduzErro(mensagem) {
  const mapa = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'User already registered': 'Já existe uma conta com esse e-mail.',
    'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  };
  return mapa[mensagem] || 'Ocorreu um erro. Tente novamente em instantes.';
}
