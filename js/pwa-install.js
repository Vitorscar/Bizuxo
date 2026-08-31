// pwa-install.js - Gerencia instalação do PWA OS-Rápida

// ============================================
// REGISTRA SERVICE WORKER
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado com sucesso!', registration);
        
        // Verifica atualizações
        registration.addEventListener('updatefound', () => {
          const newSW = registration.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nova versão disponível!');
              showUpdateNotification();
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Erro ao registrar Service Worker:', error);
      });
  });
}

// ============================================
// GERENCIA INSTALAÇÃO DO APP
// ============================================
let deferredPrompt = null;
const installBtn = document.getElementById('installAppBtn');

// Detecta evento de instalação
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  console.log('📱 App disponível para instalação');
  
  // Mostra botão de instalação
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
  
  // Dispara evento para mostrar banner
  document.dispatchEvent(new CustomEvent('appInstallAvailable'));
});

// Instala o app
async function installApp() {
  if (!deferredPrompt) {
    console.log('⚠️ Nenhum prompt de instalação disponível');
    return false;
  }
  
  try {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    
    if (result.outcome === 'accepted') {
      console.log('✅ App instalado com sucesso!');
      analytics('app_installed');
      showToast('🎉 App instalado com sucesso!');
    } else {
      console.log('❌ Instalação recusada');
    }
    
    deferredPrompt = null;
    if (installBtn) {
      installBtn.style.display = 'none';
    }
    return true;
  } catch (error) {
    console.error('❌ Erro na instalação:', error);
    return false;
  }
}

// Evento de instalação concluída
window.addEventListener('appinstalled', () => {
  console.log('✅ App instalado (evento nativo)');
  showToast('🎉 Obrigado por instalar o OS Rápida!');
  
  // Redireciona ou atualiza UI
  setTimeout(() => {
    window.location.reload();
  }, 1000);
});

// ============================================
// BOTÃO DE INSTALAÇÃO (FLOATING)
// ============================================
// Adiciona o botão ao DOM se não existir
function addInstallButton() {
  if (document.getElementById('installAppBtn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'installAppBtn';
  btn.innerHTML = '📱 Instalar App';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #2E7D32, #43A047);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 50px;
    font-size: 16px;
    font-weight: bold;
    z-index: 9999;
    display: none;
    box-shadow: 0 4px 15px rgba(46, 125, 50, 0.4);
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateX(-50%) scale(1.05)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateX(-50%) scale(1)';
  });
  
  btn.addEventListener('click', installApp);
  document.body.appendChild(btn);
}

// Adiciona o botão quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addInstallButton);
} else {
  addInstallButton();
}

// ============================================
// DETECTA MUDANÇAS DE CONEXÃO
// ============================================
window.addEventListener('online', () => {
  console.log('🌐 Voltou online!');
  document.dispatchEvent(new CustomEvent('connectionOnline'));
  showToast('🔄 Conexão restabelecida!');
  
  // Tenta sincronizar dados pendentes
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_NOW',
      store: 'propostas'
    });
  }
});

window.addEventListener('offline', () => {
  console.log('📡 Ficou offline!');
  document.dispatchEvent(new CustomEvent('connectionOffline'));
  showToast('⚠️ Você está offline. Alguns recursos podem não funcionar.', 'warning');
});

// ============================================
// NOTIFICAÇÃO DE ATUALIZAÇÃO
// ============================================
function showUpdateNotification() {
  // Remove notificações antigas
  const oldBanner = document.querySelector('.update-banner');
  if (oldBanner) oldBanner.remove();
  
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a2e;
    color: white;
    padding: 16px 24px;
    border-radius: 16px;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 90%;
    animation: slideUp 0.5s ease;
  `;
  
  banner.innerHTML = `
    <span style="font-size: 24px;">🔄</span>
    <div>
      <div style="font-weight: bold; margin-bottom: 4px;">Nova versão disponível!</div>
      <div style="font-size: 12px; opacity: 0.8;">Atualize para a última versão do app</div>
    </div>
    <button onclick="updateApp()" style="
      background: #4CAF50;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      white-space: nowrap;
      transition: background 0.3s;
    ">
      Atualizar
    </button>
  `;
  
  document.body.appendChild(banner);
  
  // Animações CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .update-banner button:hover {
      background: #45a049 !important;
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// FUNÇÃO PARA ATUALIZAR O APP
// ============================================
function updateApp() {
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Remove banner
      const banner = document.querySelector('.update-banner');
      if (banner) banner.remove();
      
      showToast('🔄 Atualizando app...');
      
      // Recarrega após delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      // Se não tiver SW esperando, só recarrega
      window.location.reload();
    }
  });
}

// ============================================
// TOAST SYSTEM (SIMPLES)
// ============================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const colors = {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#f44336',
    info: '#2196F3'
  };
  
  toast.style.cssText = `
    position: fixed;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    z-index: 10001;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    font-weight: 500;
    animation: slideUp 0.5s ease;
    max-width: 90%;
    text-align: center;
  `;
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// ============================================
// ANALYTICS STUB
// ============================================
function analytics(event, data = {}) {
  console.log(`📊 Analytics: ${event}`, data);
  // Implemente com seu analytics (Google Analytics, etc)
}

// ============================================
// EXPORTA FUNÇÕES GLOBAIS
// ============================================
window.installApp = installApp;
window.updateApp = updateApp;
window.showToast = showToast;
window.isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches;
};

console.log('📱 PWA OS-Rápida carregado!');