// ============================================================
// guard.js — protege páginas por sessão e por tipo de conta.
// Inclua ANTES do conteúdo customizado de cada página, logo
// depois de supabase-client.js:
//
//   <script src="../js/supabase-client.js"></script>
//   <script src="../js/guard.js"></script>
//   <script>
//     Guard.require('cliente').then(profile => { ... usa o profile ... });
//   </script>
// ============================================================

const Guard = {

  // exige sessão ativa e, opcionalmente, um tipo de conta específico
  // ('cliente' | 'prestador' | 'admin'). Redireciona para o login
  // (ou para o painel certo) quando a checagem falha.
  async require(tipoEsperado = null) {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = this._loginPathFromHere();
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) {
      await supabase.auth.signOut();
      window.location.href = this._loginPathFromHere();
      return null;
    }

    if (profile.status === 'bloqueado') {
      Utils.toast('Sua conta está bloqueada. Fale com o suporte.', 'error');
      await supabase.auth.signOut();
      window.location.href = this._loginPathFromHere();
      return null;
    }

    if (tipoEsperado && profile.tipo !== tipoEsperado) {
      window.location.href = this._dashboardPathFromHere(profile.tipo);
      return null;
    }

    return profile;
  },

  // calcula "../index.html" ou "index.html" dependendo da pasta atual
  _loginPathFromHere() {
    const inSubfolder = /\/(cliente|prestador|admin|publico)\//.test(window.location.pathname);
    return inSubfolder ? '../index.html' : 'index.html';
  },

  _dashboardPathFromHere(tipo) {
    const inSubfolder = /\/(cliente|prestador|admin|publico)\//.test(window.location.pathname);
    const prefix = inSubfolder ? '../' : '';
    if (tipo === 'admin') return prefix + 'admin/dashboard.html';
    if (tipo === 'prestador') return prefix + 'prestador/dashboard.html';
    return prefix + 'cliente/dashboard-cliente.html';
  }

};
