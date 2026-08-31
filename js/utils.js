// ============================================================
// utils.js — helpers compartilhados por todas as páginas
// ============================================================

const Utils = {

  formatCurrency(value) {
    return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  formatDate(isoString, opts = {}) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: opts.year ? 'numeric' : undefined
    });
  },

  formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  },

  relativeTime(isoString) {
    if (!isoString) return '—';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    const diffD = Math.round(diffH / 24);
    if (diffD === 1) return 'ontem';
    if (diffD < 7) return `há ${diffD} dias`;
    return this.formatDate(isoString, { year: true });
  },

  // pega o valor de um parâmetro da URL atual, ex: Utils.param('id')
  param(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  // mostra um toast simples no canto da tela (usa o container criado pelo notifications.js)
  toast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;width:100%;max-width:420px;padding:0 16px;';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    const bg = type === 'error' ? '#FF3B30' : type === 'success' ? '#05C167' : '#101113';
    el.style.cssText = `background:${bg};color:#fff;padding:12px 16px;border-radius:10px;font-family:'Inter',sans-serif;font-size:0.85rem;box-shadow:0 4px 16px rgba(0,0,0,0.15);opacity:0;transform:translateY(-8px);transition:.2s;`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 200);
    }, 3200);
  },

  gerarCodigo4Digitos() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

};
