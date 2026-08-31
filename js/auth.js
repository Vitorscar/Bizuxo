// ============================================
// Módulo de Autenticação - OS Rápida
// ============================================

const Auth = {
  
  // ============================================
  // CONSTANTES
  // ============================================
  
  ROUTES: {
    cliente: 'cliente/dashboard-cliente.html',
    prestador: 'prestador/dashboard.html',
    login: '../index.html',
    cadastro: 'escolha-perfil.html'
  },

  // ============================================
  // VALIDAÇÕES
  // ============================================
  
  _validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      throw new Error('E-mail inválido.');
    }
  },
  
  _validarSenha(password) {
    if (!password || password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
  },
  
  _validarCPF(cpf) {
    if (!cpf) return true; // CPF é opcional no cadastro inicial
    const cpfLimpo = cpf.replace(/\D/g, '');
    return cpfLimpo.length === 11;
  },

  // ============================================
  // VERIFICAÇÃO DO CLIENTE SUPABASE
  // ============================================
  
  _getClient() {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
      throw new Error('Cliente Supabase não foi inicializado.');
    }
    return client;
  },

  // ============================================
  // CADASTRO
  // ============================================
  
  async register({
    email,
    password,
    nome,
    cpf,
    whatsapp,
    tipo,
    cidade,
    bairro,
    cep,
    complemento,
    logradouro,
    uf,
    service_types = []
  }) {
    
    try {
      // Validações básicas
      this._validarEmail(email);
      this._validarSenha(password);
      
      if (!tipo || !['cliente', 'prestador'].includes(tipo)) {
        throw new Error('Tipo de usuário inválido.');
      }
      
      if (cpf && !this._validarCPF(cpf)) {
        throw new Error('CPF inválido.');
      }
      
      const supabase = this._getClient();
      
      console.log('📝 Iniciando cadastro:', { email, tipo, nome });
      
      // --------------------------------------------
      // 1. CRIA USUÁRIO NO SUPABASE AUTH
      // --------------------------------------------
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome || '',
            cpf: cpf || '',
            tipo: tipo,
            whatsapp: whatsapp || ''
          }
        }
      });
      
      if (error) {
        console.error('Erro no signUp:', error);
        
        if (error.message.includes('already registered') || 
            error.message.includes('already exists')) {
          throw new Error('Este e-mail já está cadastrado.');
        }
        if (error.message.includes('valid email')) {
          throw new Error('E-mail inválido.');
        }
        if (error.message.includes('password')) {
          throw new Error('Senha muito fraca. Use pelo menos 6 caracteres.');
        }
        throw error;
      }
      
      if (!data.user) {
        throw new Error('Não foi possível criar o usuário.');
      }
      
      const userId = data.user.id;
      console.log('✅ Usuário criado:', userId);
      
      // --------------------------------------------
      // 2. AGUARDA O TRIGGER CRIAR O PERFIL
      // --------------------------------------------
      
      console.log('⏳ Aguardando trigger criar perfil...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // --------------------------------------------
      // 3. VERIFICA SE O PERFIL FOI CRIADO
      // --------------------------------------------
      
      const { data: profileExistente, error: erroVerificacao } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (erroVerificacao && !erroVerificacao.message.includes('No rows found')) {
        console.warn('Erro ao verificar perfil:', erroVerificacao);
      }
      
      // --------------------------------------------
      // 4. CRIA OU ATUALIZA O PERFIL
      // --------------------------------------------
      
      const profileData = {
        id: userId,
        nome: nome || '',
        cpf: cpf || '',
        whatsapp: whatsapp || '',
        tipo: tipo || 'cliente',
        cidade: cidade || null,
        bairro: bairro || null,
        cep: cep || null,
        logradouro: logradouro || null,
        uf: uf || null,
        complemento: complemento || null,
        updated_at: new Date().toISOString()
      };
      
      // Remove campos undefined ou null
      Object.keys(profileData).forEach(key => {
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });
      
      console.log('📊 Atualizando perfil:', profileData);
      
      // Usa upsert para criar ou atualizar
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (upsertError) {
        console.error('Erro no upsert do perfil:', upsertError);
        
        // Tenta com update se upsert falhar
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', userId);
        
        if (updateError) {
          console.error('Erro no update do perfil:', updateError);
          
          // Tenta com insert se update falhar
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([profileData]);
          
          if (insertError) {
            console.error('Erro no insert do perfil:', insertError);
            // Não lança erro crítico - usuário já foi criado
          } else {
            console.log('✅ Perfil criado com insert');
          }
        } else {
          console.log('✅ Perfil atualizado com update');
        }
      } else {
        console.log('✅ Perfil criado/atualizado com upsert');
      }
      
      // --------------------------------------------
      // 5. VINCULA TIPOS DE SERVIÇO (PRESTADOR)
      // --------------------------------------------
      
      if (tipo === 'prestador' && Array.isArray(service_types) && service_types.length > 0) {
        console.log('🔧 Vinculando serviços:', service_types);
        
        const vinculos = service_types
          .map(stId => parseInt(stId, 10))
          .filter(id => !isNaN(id) && id > 0)
          .map(id => ({
            provider_id: userId,
            service_type_id: id
          }));
        
        if (vinculos.length > 0) {
          const { error: vincError } = await supabase
            .from('provider_service_types')
            .insert(vinculos);
          
          if (vincError) {
            console.warn('Erro ao vincular serviços:', vincError);
          } else {
            console.log('✅ Serviços vinculados:', vinculos.length);
          }
        }
      }
      
      // --------------------------------------------
      // 6. RETORNA SUCESSO
      // --------------------------------------------
      
      console.log('✅ Cadastro completo!');
      
      return {
        success: true,
        user: data.user,
        needsEmailConfirmation: !data.session
      };
      
    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      return {
        success: false,
        error: error.message || 'Erro ao realizar cadastro.'
      };
    }
  },

  // ============================================
  // LOGIN
  // ============================================
  
  async login(email, password) {
    
    try {
      // Validações básicas
      this._validarEmail(email);
      
      if (!password) {
        throw new Error('Digite sua senha.');
      }
      
      const supabase = this._getClient();
      
      console.log('🔐 Tentando login:', email);
      
      // --------------------------------------------
      // 1. FAZ LOGIN
      // --------------------------------------------
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Erro no login:', error);
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('E-mail não confirmado. Verifique sua caixa de entrada.');
        }
        throw error;
      }
      
      if (!data.user) {
        throw new Error('Usuário não encontrado.');
      }
      
      console.log('✅ Login realizado:', data.user.id);
      
      // --------------------------------------------
      // 2. BUSCA PERFIL DO USUÁRIO
      // --------------------------------------------
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        
        // Se o perfil não existe, tenta criar
        if (profileError.message.includes('No rows found')) {
          console.log('⚠️ Perfil não encontrado, criando...');
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              nome: data.user.user_metadata?.nome || '',
              tipo: data.user.user_metadata?.tipo || 'cliente',
              email: email
            }]);
          
          if (insertError) {
            console.error('Erro ao criar perfil:', insertError);
          }
        }
      }
      
      // --------------------------------------------
      // 3. VERIFICA SE TEM TIPO DEFINIDO
      // --------------------------------------------
      
      if (!profile?.tipo) {
        console.warn('⚠️ Usuário sem tipo definido');
        window.location.href = 'escolha-perfil.html';
        return { success: false, error: 'Complete seu cadastro.' };
      }
      
      // --------------------------------------------
      // 4. REDIRECIONA PARA O DASHBOARD CORRETO
      // --------------------------------------------
      
      const rota = this.ROUTES[profile.tipo];
      
      if (!rota) {
        throw new Error('Tipo de usuário inválido.');
      }
      
      // Armazena dados básicos no sessionStorage
      sessionStorage.setItem('userProfile', JSON.stringify({
        id: data.user.id,
        nome: profile.nome,
        tipo: profile.tipo,
        cidade: profile.cidade,
        uf: profile.uf
      }));
      
      console.log('🔄 Redirecionando para:', rota);
      
      // Redireciona
      window.location.href = rota;
      
      return {
        success: true,
        user: data.user,
        profile
      };
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return {
        success: false,
        error: error.message || 'Erro ao fazer login.'
      };
    }
  },

  // ============================================
  // LOGOUT
  // ============================================
  
  async logout() {
    try {
      const supabase = this._getClient();
      await supabase.auth.signOut();
      console.log('✅ Logout realizado');
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Limpa dados locais
      sessionStorage.removeItem('userProfile');
      localStorage.removeItem('supabase.auth.token');
      
      // Redireciona para login
      window.location.href = this.ROUTES.login;
    }
  },

  // ============================================
  // OBTER USUÁRIO ATUAL
  // ============================================
  
  async getCurrentUser() {
    try {
      const supabase = this._getClient();
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      return user;
    } catch (error) {
      console.error('Erro ao obter usuário:', error);
      return null;
    }
  },

  // ============================================
  // OBTER PERFIL COMPLETO DO USUÁRIO LOGADO
  // ============================================
  
  async getCurrentProfile() {
    try {
      const user = await this.getCurrentUser();
      
      if (!user) return null;
      
      const supabase = this._getClient();
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      return profile;
    } catch (error) {
      console.error('Erro ao obter perfil:', error);
      return null;
    }
  },

  // ============================================
  // VERIFICAR SE USUÁRIO ESTÁ AUTENTICADO
  // ============================================
  
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  },

  // ============================================
  // REDIRECIONAR SE NÃO AUTENTICADO
  // ============================================
  
  async requireAuth(tipoEsperado = null) {
    const user = await this.getCurrentUser();
    
    if (!user) {
      window.location.href = this.ROUTES.login;
      return null;
    }
    
    if (tipoEsperado) {
      const profile = await this.getCurrentProfile();
      
      if (profile?.tipo !== tipoEsperado) {
        // Redireciona para o dashboard correto
        const rota = this.ROUTES[profile?.tipo] || this.ROUTES.login;
        window.location.href = rota;
        return null;
      }
    }
    
    return user;
  },

  // ============================================
  // ATUALIZAR SENHA
  // ============================================
  
  async updatePassword(novaSenha) {
    try {
      this._validarSenha(novaSenha);
      
      const supabase = this._getClient();
      
      const { data, error } = await supabase.auth.updateUser({
        password: novaSenha
      });
      
      if (error) throw error;
      
      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ============================================
  // RECUPERAR SENHA (ESQUECI MINHA SENHA)
  // ============================================
  
  async resetPassword(email) {
    try {
      this._validarEmail(email);
      
      const supabase = this._getClient();
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha.html`
      });
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'E-mail de recuperação enviado com sucesso.'
      };
    } catch (error) {
      console.error('Erro ao recuperar senha:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ============================================
  // ALIASES PARA COMPATIBILIDADE
  // ============================================
  
  async getUsuarioAtual() {
    return await this.getCurrentUser();
  },
  
  async cadastrarUsuario(email, senha, tipoPerfil) {
    return await this.register({
      email,
      password: senha,
      tipo: tipoPerfil
    });
  },
  
  async fazerLogin(email, senha) {
    return await this.login(email, senha);
  },

  // ============================================
  // BUSCAR ENDEREÇO POR CEP
  // ============================================
  
  async buscarEnderecoPorCep(cep) {
    try {
      // Remove caracteres não numéricos
      const cepLimpo = cep.replace(/\D/g, '');
      
      // Valida formato
      if (cepLimpo.length !== 8) {
        return {
          success: false,
          error: 'CEP inválido. Digite 8 números.'
        };
      }
      
      // Consulta ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar CEP');
      }
      
      const data = await response.json();
      
      // Verifica se CEP existe
      if (data.erro) {
        return {
          success: false,
          error: 'CEP não encontrado.'
        };
      }
      
      // Retorna endereço formatado
      return {
        success: true,
        data: {
          cep: data.cep,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf,
          complemento: data.complemento || ''
        }
      };
      
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      return {
        success: false,
        error: 'Erro ao buscar o CEP. Tente novamente.'
      };
    }
  },

  // ============================================
  // ATUALIZAR PERFIL
  // ============================================
  
  async updateProfile(userId, dadosAtualizados) {
    try {
      const supabase = this._getClient();
      
      // Remove campos undefined
      Object.keys(dadosAtualizados).forEach(key => {
        if (dadosAtualizados[key] === undefined) {
          delete dadosAtualizados[key];
        }
      });
      
      const { data, error } = await supabase
        .from('profiles')
        .update(dadosAtualizados)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        profile: data
      };
      
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ============================================
  // ATUALIZAR PERFIL COM CEP (COMPATIBILIDADE)
  // ============================================
  
  async atualizarPerfilComCep(userId, dadosAtualizados) {
    return await this.updateProfile(userId, dadosAtualizados);
  },

  // ============================================
  // ATUALIZAR METADADOS DO USUÁRIO
  // ============================================
  
  async updateUserMetadata(metadata) {
    try {
      const supabase = this._getClient();
      
      const { data, error } = await supabase.auth.updateUser({
        data: metadata
      });
      
      if (error) throw error;
      
      return {
        success: true,
        user: data.user
      };
      
    } catch (error) {
      console.error('Erro ao atualizar metadados:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

};

// ============================================
// DISPONIBILIZA GLOBALMENTE
// ============================================
window.Auth = Auth;

// Para compatibilidade com códigos antigos
window.auth = Auth;

console.log('✅ Auth carregado com sucesso');