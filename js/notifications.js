// ============================================================
// notifications.js — notificações in-app via tabela 'notifications'
// (realtime) + toasts. Push web (service worker) fica como stub,
// ative quando tiver as chaves VAPID do seu projeto.
// ============================================================

const Notifications = {

  _channel: null,

  // busca as notificações do usuário logado (mais recentes primeiro)
  async list(limit = 20) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data;
  },

  async unreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);
    if (error) { console.error(error); return 0; }
    return count || 0;
  },

  async markAsRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  async markAllAsRead() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
  },

  // assina novas notificações em tempo real e chama onNovaNotificacao(payload)
  async subscribe(onNovaNotificacao) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    this._channel = supabase
      .channel('notifications:' + session.user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${session.user.id}`
      }, (payload) => {
        Utils.toast(payload.new.title, 'info');
        if (onNovaNotificacao) onNovaNotificacao(payload.new);
      })
      .subscribe();
  },

  unsubscribe() {
    if (this._channel) supabase.removeChannel(this._channel);
  },

  // ---- push web (stub) ----
  // Para ativar: gere chaves VAPID, registre um service worker (sw.js)
  // e troque PUBLIC_VAPID_KEY abaixo pela sua chave pública.
  async ativarPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      Utils.toast('Notificações push não são suportadas neste navegador.', 'error');
      return;
    }
    const PUBLIC_VAPID_KEY = 'SUA-CHAVE-VAPID-PUBLICA';
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: PUBLIC_VAPID_KEY
      });
      // Lógica Supabase: salvar `sub` numa tabela push_subscriptions vinculada ao user
      console.log('Push subscription:', sub);
    } catch (err) {
      console.error('Erro ao ativar push:', err);
    }
  }

};
