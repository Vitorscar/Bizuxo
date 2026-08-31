// sw.js - Service Worker para OS Rápida

const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `os-rapida-${CACHE_VERSION}`;

// 🔥 ARQUIVOS PARA CACHE OFFLINE (TODOS OS HTML PRINCIPAIS)
const FILES_TO_CACHE = [
  // Páginas principais
  '/',
  '/index.html',
  '/escolha-perfil.html',
  '/cadastro-cliente.html',
  '/cadastro-prestador.html',
  '/onboarding-prestador.html',
  '/esqueci-senha.html',
  '/termos.html',
  '/404.html',
  
  // CSS
  '/style.css',
  
  // JS Core
  '/js/supabase-client.js',
  '/js/auth.js',
  '/js/guard.js',
  '/js/notifications.js',
  '/js/utils.js',
  '/js/pwa-install.js',
  
  // Cliente
  '/cliente/dashboard-cliente.html',
  '/cliente/minhas-demandas.html',
  '/cliente/nova-demanda.html',
  '/cliente/detalhe-demanda.html',
  '/cliente/detalhe-demanda-cliente.html',
  '/cliente/confirmar-demanda.html',
  '/cliente/servicos-contratados.html',
  '/cliente/checkout.html',
  '/cliente/avaliar.html',
  '/cliente/prestador-publico.html',
  '/cliente/meu-perfil-cliente.html',
  
  // Prestador
  '/prestador/dashboard.html',
  '/prestador/demandas-disponiveis.html',
  '/prestador/detalhe-demanda-prestador.html',
  '/prestador/minhas-propostas.html',
  '/prestador/ordens-servico.html',
  '/prestador/financeiro.html',
  '/prestador/meus-trabalhos.html',
  '/prestador/prestador-publico.html',
  '/prestador/meu-perfil.html',
  
  // Shared
  '/shared/chat-widget.html',
  '/shared/notification-center.html',
  
  // Admin
  '/admin/dashboard.html',
  '/admin/usuarios.html',
  '/admin/prestadores.html',
  '/admin/disputas.html',
  '/admin/denuncias.html',
  '/admin/financeiro.html',
  
  // Assets essenciais
  '/assets/img/logo.png',
  '/assets/img/logo-512.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// URLs para NÃO cachear (dados dinâmicos)
const IGNORE_CACHE = [
  '/api/',
  '/auth/',
  '/supabase/',
  '/rest/v1/',
  '/.netlify/',
  '/_next/'
];

// ============================================
// INSTALAÇÃO
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW OS-Rápida] Instalando...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW OS-Rápida] Cacheando arquivos...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[SW OS-Rápida] Instalação concluída!');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW OS-Rápida] Erro na instalação:', error);
        // Continua mesmo com erro em alguns arquivos
      })
  );
});

// ============================================
// ATIVAÇÃO
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW OS-Rápida] Ativando...', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('os-rapida-')) {
              console.log('[SW OS-Rápida] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      })
      .then(() => {
        console.log('[SW OS-Rápida] Ativação concluída!');
        return self.clients.claim();
      })
  );
});

// ============================================
// INTERCEPTAÇÃO DE REQUISIÇÕES
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora requisições para APIs
  if (IGNORE_CACHE.some(ignore => url.pathname.includes(ignore))) {
    return;
  }
  
  // Ignora requisições para Supabase
  if (url.hostname.includes('supabase.co')) {
    return;
  }
  
  // Estratégia: Network First com fallback para cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Verifica se a resposta é válida
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clona a resposta para cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            try {
              cache.put(event.request, responseToCache);
            } catch (err) {
              console.warn('[SW OS-Rápida] Erro ao cachear:', err);
            }
          });
        
        return response;
      })
      .catch(() => {
        // Fallback para cache quando offline
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Se for uma requisição de navegação, mostra página offline
            if (event.request.mode === 'navigate') {
              // Verifica se o usuário está autenticado (via cookie/session)
              // Se não estiver, redireciona para login
              return caches.match('/index.html');
            }
            
            // Para outros tipos de requisição, retorna erro
            return new Response('Recurso não disponível offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ============================================
// SINCRONIZAÇÃO EM SEGUNDO PLANO
// ============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-propostas') {
    event.waitUntil(syncPropostas());
  }
  if (event.tag === 'sync-mensagens') {
    event.waitUntil(syncMensagens());
  }
});

// ============================================
// NOTIFICAÇÕES PUSH
// ============================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  // Personaliza notificações para OS-Rápida
  const options = {
    body: data.body || '📢 Você tem uma nova notificação no OS Rápida!',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      type: data.type || 'notification',
      osId: data.osId || null,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '🔍 Ver agora'
      },
      {
        action: 'close',
        title: '✖ Fechar'
      }
    ],
    tag: data.tag || 'os-rapida-notification',
    requireInteraction: true,
    silent: false
  };

  // Adiciona ícone específico por tipo
  if (data.type === 'nova-proposta') {
    options.body = `💼 Nova proposta para sua demanda! ${data.body || ''}`;
    options.image = '/assets/img/proposta-icon.png';
  } else if (data.type === 'os-concluida') {
    options.body = `✅ Ordem de serviço concluída! ${data.body || ''}`;
    options.image = '/assets/img/concluida-icon.png';
  } else if (data.type === 'mensagem') {
    options.body = `💬 Nova mensagem: ${data.body || ''}`;
  } else if (data.type === 'pagamento') {
    options.body = `💰 Pagamento recebido! ${data.body || ''}`;
    options.image = '/assets/img/pagamento-icon.png';
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || '🔔 OS Rápida',
      options
    )
  );
});

// ============================================
// CLIQUE EM NOTIFICAÇÕES
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data.url || '/';
  const osId = event.notification.data.osId;
  const type = event.notification.data.type;

  let targetUrl = url;

  // Redireciona baseado no tipo da notificação
  if (type === 'nova-proposta' && osId) {
    targetUrl = `/cliente/detalhe-demanda.html?id=${osId}`;
  } else if (type === 'os-concluida' && osId) {
    targetUrl = `/prestador/ordens-servico.html?os=${osId}`;
  } else if (type === 'mensagem' && osId) {
    targetUrl = `/shared/chat-widget.html?os=${osId}`;
  } else if (type === 'pagamento') {
    targetUrl = `/prestador/financeiro.html`;
  }

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(targetUrl)
    );
  } else if (event.action === 'close') {
    // Apenas fecha
  }
});

// ============================================
// FUNÇÕES DE SINCRONIZAÇÃO
// ============================================
async function syncPropostas() {
  console.log('[SW OS-Rápida] Sincronizando propostas pendentes...');
  try {
    // Busca propostas do IndexedDB
    const pendingPropostas = await getPendingData('propostas');
    if (pendingPropostas.length > 0) {
      // Envia para o Supabase
      await enviarPropostas(pendingPropostas);
      await clearPendingData('propostas');
      console.log('[SW OS-Rápida] Propostas sincronizadas!');
    }
  } catch (error) {
    console.error('[SW OS-Rápida] Erro na sincronização de propostas:', error);
  }
}

async function syncMensagens() {
  console.log('[SW OS-Rápida] Sincronizando mensagens pendentes...');
  try {
    const pendingMessages = await getPendingData('mensagens');
    if (pendingMessages.length > 0) {
      await enviarMensagens(pendingMessages);
      await clearPendingData('mensagens');
      console.log('[SW OS-Rápida] Mensagens sincronizadas!');
    }
  } catch (error) {
    console.error('[SW OS-Rápida] Erro na sincronização de mensagens:', error);
  }
}

// ============================================
// HELPERS PARA INDEXEDDB (SIMPLES)
// ============================================
function getPendingData(store) {
  return new Promise((resolve) => {
    const request = indexedDB.open('OSRapidaOffline', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const getAll = objectStore.getAll();
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });
}

function clearPendingData(store) {
  return new Promise((resolve) => {
    const request = indexedDB.open('OSRapidaOffline', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const clear = objectStore.clear();
      clear.onsuccess = () => resolve();
      clear.onerror = () => resolve();
    };
    request.onerror = () => resolve();
  });
}

async function enviarPropostas(propostas) {
  // Implemente com Supabase
  console.log('[SW OS-Rápida] Enviando propostas:', propostas);
}

async function enviarMensagens(mensagens) {
  // Implemente com Supabase
  console.log('[SW OS-Rápida] Enviando mensagens:', mensagens);
}

// ============================================
// MENSAGENS DO SERVICE WORKER
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[SW OS-Rápida] Cache atualizado manualmente');
        event.ports[0].postMessage({ status: 'updated' });
      });
  }
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    if (event.data.store === 'propostas') {
      syncPropostas();
    } else if (event.data.store === 'mensagens') {
      syncMensagens();
    }
  }
});

console.log('[SW OS-Rápida] Service Worker carregado!');