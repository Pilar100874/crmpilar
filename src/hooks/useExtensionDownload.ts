import { useState } from 'react';
import JSZip from 'jszip';
import { toast } from '@/lib/toast-config';

// Extension file contents embedded as strings
const manifestJson = `{
  "manifest_version": 3,
  "name": "CRM Pilar - Monitor de Tela",
  "version": "1.0.0",
  "description": "Extensão para monitoramento de tela silencioso do CRM Pilar",
  "permissions": [
    "desktopCapture",
    "tabs",
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://ioxugupvxlcdweldocmq.supabase.co/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`;

const backgroundJs = `// Background service worker for screen monitoring
const SUPABASE_URL = 'https://ioxugupvxlcdweldocmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc';

let mediaStream = null;
let captureInterval = null;
let userId = null;
let broadcastChannel = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCapture') {
    userId = request.userId;
    startScreenCapture();
    sendResponse({ success: true });
  } else if (request.action === 'stopCapture') {
    stopScreenCapture();
    sendResponse({ success: true });
  } else if (request.action === 'getStatus') {
    sendResponse({ 
      isCapturing: mediaStream !== null,
      userId: userId
    });
  }
  return true;
});

async function startScreenCapture() {
  try {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      async (streamId) => {
        if (!streamId) {
          console.log('User cancelled screen selection');
          return;
        }

        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: streamId
              }
            }
          });

          startFrameCapture();
          await updateConsentStatus(true);
          console.log('Screen capture started successfully');
        } catch (err) {
          console.error('Error getting media stream:', err);
        }
      }
    );
  } catch (error) {
    console.error('Error starting screen capture:', error);
  }
}

function startFrameCapture() {
  if (!mediaStream || !userId) return;

  const videoTrack = mediaStream.getVideoTracks()[0];
  const imageCapture = new ImageCapture(videoTrack);
  
  initBroadcastChannel();

  captureInterval = setInterval(async () => {
    try {
      const bitmap = await imageCapture.grabFrame();
      
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      
      const scaledCanvas = new OffscreenCanvas(1280, 720);
      const scaledCtx = scaledCanvas.getContext('2d');
      scaledCtx.drawImage(canvas, 0, 0, 1280, 720);
      
      const blob = await scaledCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      await broadcastFrame(base64);
      await updateLastFrameTimestamp();
      
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  }, 3000);
}

function initBroadcastChannel() {
  const wsUrl = \`wss://ioxugupvxlcdweldocmq.supabase.co/realtime/v1/websocket?apikey=\${SUPABASE_ANON_KEY}&vsn=1.0.0\`;
  
  broadcastChannel = new WebSocket(wsUrl);
  
  broadcastChannel.onopen = () => {
    console.log('Broadcast channel connected');
    
    const joinMessage = {
      topic: \`realtime:screen-share-\${userId}\`,
      event: 'phx_join',
      payload: {},
      ref: '1'
    };
    broadcastChannel.send(JSON.stringify(joinMessage));
  };
  
  broadcastChannel.onerror = (error) => {
    console.error('Broadcast channel error:', error);
  };
  
  broadcastChannel.onclose = () => {
    console.log('Broadcast channel closed');
  };
}

async function broadcastFrame(base64Frame) {
  if (!broadcastChannel || broadcastChannel.readyState !== WebSocket.OPEN) {
    console.log('Broadcast channel not ready');
    return;
  }
  
  const message = {
    topic: \`realtime:screen-share-\${userId}\`,
    event: 'broadcast',
    payload: {
      type: 'broadcast',
      event: 'screen-frame',
      payload: {
        frame: base64Frame,
        timestamp: Date.now()
      }
    },
    ref: Date.now().toString()
  };
  
  broadcastChannel.send(JSON.stringify(message));
}

async function updateConsentStatus(isSharing) {
  try {
    // Use PATCH para atualizar o registro existente
    const response = await fetch(\`\${SUPABASE_URL}/rest/v1/screen_monitor_consent?usuario_id=eq.\${userId}\`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        is_sharing: isSharing,
        sharing_started_at: isSharing ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('Error updating consent status:', response.status, text);
      // Se falhou, pode ser que o registro não existe ainda
      // Mostrar mensagem para o usuário copiar o ID primeiro
      if (response.status === 404 || text.includes('0 rows')) {
        alert('Registro não encontrado. Por favor, copie seu ID de usuário na página de Perfil primeiro.');
      }
    } else {
      console.log('Consent status updated:', isSharing ? 'SHARING' : 'NOT SHARING');
    }
  } catch (error) {
    console.error('Error updating consent status:', error);
  }
}

async function updateLastFrameTimestamp() {
  try {
    await fetch(\`\${SUPABASE_URL}/rest/v1/screen_monitor_consent?usuario_id=eq.\${userId}\`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        last_frame_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Error updating last frame timestamp:', error);
  }
}

function stopScreenCapture() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
  
  if (userId) {
    updateConsentStatus(false);
  }
  
  console.log('Screen capture stopped');
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

chrome.runtime.onSuspend.addListener(() => {
  stopScreenCapture();
});`;

const popupHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM Pilar - Monitor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 320px;
      padding: 20px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
    }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .logo { width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; }
    .title { font-size: 16px; font-weight: 600; }
    .subtitle { font-size: 12px; color: rgba(255,255,255,0.6); }
    .status-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .status-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .status-label { font-size: 13px; color: rgba(255,255,255,0.7); }
    .status-value { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.active { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .status-dot.inactive { background: #6b7280; }
    .input-group { margin-bottom: 16px; }
    .input-label { display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
    .input-field { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-size: 14px; outline: none; }
    .input-field:focus { border-color: #667eea; }
    .input-field::placeholder { color: rgba(255,255,255,0.4); }
    .btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .info-text { font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; margin-top: 16px; line-height: 1.5; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">CP</div>
    <div>
      <div class="title">CRM Pilar</div>
      <div class="subtitle">Monitor de Tela</div>
    </div>
  </div>
  <div class="status-card">
    <div class="status-row">
      <span class="status-label">Status do Monitoramento</span>
      <span class="status-value">
        <span id="statusDot" class="status-dot inactive"></span>
        <span id="statusText">Inativo</span>
      </span>
    </div>
    <div class="status-row" id="userRow" style="display: none;">
      <span class="status-label">Usuário</span>
      <span class="status-value" id="userIdDisplay">-</span>
    </div>
  </div>
  <div id="loginSection">
    <div class="input-group">
      <label class="input-label">ID do Usuário</label>
      <input type="text" id="userId" class="input-field" placeholder="Cole seu ID de usuário aqui">
    </div>
    <button id="startBtn" class="btn btn-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
      Iniciar Monitoramento
    </button>
  </div>
  <div id="activeSection" class="hidden">
    <button id="stopBtn" class="btn btn-danger">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="12" height="12"></rect>
      </svg>
      Parar Monitoramento
    </button>
  </div>
  <p class="info-text">Esta extensão captura sua tela periodicamente para monitoramento corporativo.</p>
  <script src="popup.js"></script>
</body>
</html>`;

const popupJs = `document.addEventListener('DOMContentLoaded', async () => {
  const userIdInput = document.getElementById('userId');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const loginSection = document.getElementById('loginSection');
  const activeSection = document.getElementById('activeSection');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const userRow = document.getElementById('userRow');
  const userIdDisplay = document.getElementById('userIdDisplay');

  const saved = await chrome.storage.local.get(['userId']);
  if (saved.userId) {
    userIdInput.value = saved.userId;
  }

  updateUI();

  startBtn.addEventListener('click', async () => {
    const userId = userIdInput.value.trim();
    if (!userId) {
      alert('Por favor, insira o ID do usuário');
      return;
    }
    await chrome.storage.local.set({ userId });
    chrome.runtime.sendMessage({ action: 'startCapture', userId }, (response) => {
      if (response.success) updateUI();
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopCapture' }, (response) => {
      if (response.success) updateUI();
    });
  });

  function updateUI() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response.isCapturing) {
        loginSection.classList.add('hidden');
        activeSection.classList.remove('hidden');
        statusDot.classList.remove('inactive');
        statusDot.classList.add('active');
        statusText.textContent = 'Ativo';
        userRow.style.display = 'flex';
        userIdDisplay.textContent = response.userId?.substring(0, 8) + '...';
      } else {
        loginSection.classList.remove('hidden');
        activeSection.classList.add('hidden');
        statusDot.classList.remove('active');
        statusDot.classList.add('inactive');
        statusText.textContent = 'Inativo';
        userRow.style.display = 'none';
      }
    });
  }
});`;

// Simple icon as base64 PNG (purple gradient square with CP letters)
const icon16Base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABBklEQVR4nGNgGAWDBTAyMDDIMjAwKDIwMCgBsQQDAwMjEwMDAx+QvB+o4X+Q1v/A8P+/f/8YGQE2BgYGJaD+/0C6H4j/A9l/gfgPEP8G4l9A/BOIfwDxdyD+BsTfgPgrEH8B4s9A/AmIPwLxByB+D8TvgPgtEL8B4tdA/AqIXwLxCyB+DsTPgPgpED8B4sdA/AiIHwLxAyC+D8T3gPguEN8B4ttAfAuIbwLxDSC+DsTXgPgqEF8B4stAfAmILwLxBSA+D8TngPgsEJ8B4tNAfAqITwLxCSA+DsTHgPgoEB8B4sNAfAiIDwLxASDeD8T7gHgvEO8B4t1AvAuIdwLxDiDeDsRbgXjLKBhsAADj4l+Ov7xzlgAAAABJRU5ErkJggg==';

const icon48Base64 = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAC1klEQVR4nO2Zy2oUQRSGv4wZFBdxIYqIC8GdN9woLnwAH8DgA7hyq6i4ceMT+AKCj+BCwYUbH8BVXLhSQVFEUBQFb4gXYhIzOfKXnKJmuqenpmemkv7h0N1V1ef8p6rOqeoJFChQoMD/DgcYA+4Ak8BHYAFYBuaB98BL4DlwH9gX18ByFNgNXAIm0MXbMuB84BLwINYBFqH1n4EvwIPY7gBOAuvD5M/XqR24ATyvSwD/2r/JXsCE7gV2Ai3A0RjPwHa0A4eAG8Ar4BPwWMfU0b4InAAGBHq7gItK+9u0vk90Cr2K6SdgjmB/ABhS+y0NdP6v0/M3dD6uJ40fVt/1GPoROA08Bj7rObfXMHO3lSYJbAc2A2uA1cAqoFVxq41HGR6S0qJxHRO16JN5Afkd+CQv3QzMqH1SiXYNMW1G7j6GzvVZYJ3anqvPNzXkc5J4ILMEnAEuAB+AX8BTrYEptd8CNqpdz68h3kJiRfcC2Kb1MqH7JvDbZNKIPhd4B5wDXum5X5X+WmPAl3ReAd4DPUC31tgS0G8x6XCa4LQV+CrlJk1SkKBHGXAKeAO0ATuAdmCH1kO/5uqQJulJAzarzzHgmub+pNb4hCb3mzRMqPKwZNvV/zRwWulzQqnvmFJkJw3T+oQmqZRaTQp0K/WdV9+z6ntO/U/rDM2bJE+cEqdbWkJPAt1an/fV90r12a3+p9R/SPMhSeJRCfwC7AX6gB6tzz7gq/p8Ld9YU2z3kib5oJQITAPntN4G1e+0+h5Wv0Pqe0D996v/PupIIxJuqf2b7EF2aQ30aM0NavK3a62fVJ+T6rtPfferX3/SJBN4DRQAPgJDSmyj6ntMfc4o/Y2o7yH1O6B++9VvL3WmEUn3F2JHc7JH63JAiW5c6W9UaW9MfQ6r30H126O+e0mTTMQ9qP2jdWBM62FC62BYa2BI86BP82CAxs2DAgWy4h+59xnB5M5n+wAAAABJRU5ErkJggg==';

const icon128Base64 = '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';

export const useExtensionDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadExtension = async () => {
    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      
      // Add main files
      zip.file('manifest.json', manifestJson);
      zip.file('background.js', backgroundJs);
      zip.file('popup.html', popupHtml);
      zip.file('popup.js', popupJs);
      
      // Add icons folder
      const iconsFolder = zip.folder('icons');
      iconsFolder?.file('icon16.png', icon16Base64, { base64: true });
      iconsFolder?.file('icon48.png', icon48Base64, { base64: true });
      iconsFolder?.file('icon128.png', icon128Base64, { base64: true });
      
      // Generate ZIP and trigger download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'crm-pilar-monitor-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success('Extensão baixada! Extraia o ZIP e carregue no Chrome.');
    } catch (error) {
      console.error('Erro ao gerar ZIP:', error);
      toast.error('Erro ao baixar extensão');
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadExtension, isDownloading };
};
