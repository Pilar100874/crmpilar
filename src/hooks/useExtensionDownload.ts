import { useState } from 'react';
import JSZip from 'jszip';
import { toast } from '@/lib/toast-config';

// Extension file contents embedded as strings - v2.1.0 with on-demand frame sending
const manifestJson = `{
  "manifest_version": 3,
  "name": "CRM Pilar - Monitor de Tela",
  "version": "2.1.0",
  "description": "Extensão para monitoramento de tela sob demanda do CRM Pilar",
  "permissions": [
    "tabs",
    "activeTab",
    "storage",
    "offscreen"
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

const backgroundJs = `// Background service worker for screen monitoring v2.1.0
// Only sends frames when admin is viewing (on-demand)

const SUPABASE_URL = 'https://ioxugupvxlcdweldocmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc';

let currentUserId = null;
let framesSent = 0;
let lastBroadcast = 0;
let lastFrameUpdate = 0;
let offscreenCreated = false;
let viewerCheckInterval = null;
let lastViewerActive = false;

// Recuperar estado salvo na inicialização
chrome.storage.local.get(['userId', 'isCapturing'], (data) => {
  if (data.userId) {
    currentUserId = data.userId;
    console.log('Background v2.1: userId recuperado:', currentUserId);
  }
  if (data.isCapturing) {
    console.log('Background v2.1: Captura estava ativa, iniciando polling de viewer...');
    startViewerPolling();
  }
});

function startViewerPolling() {
  if (viewerCheckInterval) return;
  
  console.log('Background: Iniciando polling de viewer...');
  viewerCheckInterval = setInterval(checkViewer, 2000);
  checkViewer(); // Verificar imediatamente
}

function stopViewerPolling() {
  if (viewerCheckInterval) {
    clearInterval(viewerCheckInterval);
    viewerCheckInterval = null;
    console.log('Background: Polling de viewer parado');
  }
}

async function checkViewer() {
  if (!currentUserId) return;
  
  try {
    const result = await callEdgeFunction('extension-status', { 
      usuario_id: currentUserId, 
      action: 'check-viewer' 
    });
    
    const viewerActive = result.data?.viewer_active || false;
    
    if (viewerActive !== lastViewerActive) {
      console.log('Background: Viewer status mudou:', viewerActive);
      lastViewerActive = viewerActive;
      
      // Notificar offscreen sobre mudança de status
      chrome.runtime.sendMessage({ 
        action: 'offscreen-viewer-status', 
        viewerActive: viewerActive 
      });
    }
  } catch (e) {
    console.log('Background: Erro ao verificar viewer:', e.message);
  }
}

async function checkOffscreenDocument() {
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    offscreenCreated = contexts.length > 0;
  } catch (e) {
    offscreenCreated = false;
  }
}

async function createOffscreenDocument() {
  await checkOffscreenDocument();
  
  if (offscreenCreated) {
    console.log('Background: Offscreen já existe');
    return true;
  }
  
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DISPLAY_MEDIA'],
      justification: 'Screen capture for employee monitoring'
    });
    offscreenCreated = true;
    console.log('Background: Offscreen document criado');
    return true;
  } catch (e) {
    console.error('Background: Erro ao criar offscreen:', e.message);
    return false;
  }
}

async function closeOffscreenDocument() {
  await checkOffscreenDocument();
  
  if (!offscreenCreated) return;
  
  try {
    await chrome.offscreen.closeDocument();
    offscreenCreated = false;
  } catch (e) {
    console.error('Background: Erro ao fechar offscreen:', e.message);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background v2.1 received:', request.action);
  
  if (request.action === 'startCapture') {
    const captureUserId = request.userId;
    currentUserId = captureUserId;
    
    chrome.storage.local.set({ userId: captureUserId, isCapturing: true }, async () => {
      try {
        const result = await callEdgeFunction('extension-status', { 
          usuario_id: captureUserId, 
          action: 'start' 
        });
        
        const offscreenOk = await createOffscreenDocument();
        
        if (offscreenOk) {
          chrome.runtime.sendMessage({ action: 'offscreen-start-capture', userId: captureUserId });
          startViewerPolling();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Falha ao criar documento offscreen' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
    
  } else if (request.action === 'stopCapture') {
    chrome.storage.local.set({ isCapturing: false });
    stopViewerPolling();
    
    (async () => {
      try {
        chrome.runtime.sendMessage({ action: 'offscreen-stop-capture' });
        await closeOffscreenDocument();
        
        if (currentUserId) {
          await callEdgeFunction('extension-status', { usuario_id: currentUserId, action: 'stop' });
        }
        
        framesSent = 0;
        lastViewerActive = false;
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
    
  } else if (request.action === 'sendFrame') {
    // Frame recebido do offscreen - só envia se viewer está ativo
    if (!currentUserId) {
      sendResponse({ success: false });
      return;
    }
    
    if (!lastViewerActive) {
      // Viewer não está ativo, não enviar frame
      console.log('Background: Frame ignorado (sem viewer ativo)');
      sendResponse({ success: true, skipped: true });
      return;
    }
    
    const now = Date.now();
    framesSent++;
    
    // Broadcast do frame (a cada 2 segundos quando viewer está ativo)
    if (now - lastBroadcast > 2000) {
      console.log('Background: Enviando frame #' + framesSent + ' (viewer ativo)');
      callEdgeFunction('broadcast-frame', { usuario_id: currentUserId, frame: request.frame });
      lastBroadcast = now;
    }
    
    // Heartbeat no banco a cada 5 segundos
    if (now - lastFrameUpdate > 5000) {
      callEdgeFunction('extension-status', { usuario_id: currentUserId, action: 'frame' });
      lastFrameUpdate = now;
    }
    
    sendResponse({ success: true, framesSent });
    return true;
    
  } else if (request.action === 'getStatus') {
    chrome.storage.local.get(['isCapturing', 'userId'], async (data) => {
      await checkOffscreenDocument();
      sendResponse({ 
        isCapturing: data.isCapturing && offscreenCreated,
        userId: data.userId || currentUserId,
        framesSent: framesSent,
        offscreenActive: offscreenCreated,
        viewerActive: lastViewerActive
      });
    });
    return true;
    
  } else if (request.action === 'captureError') {
    console.error('Background: Erro de captura:', request.error);
    chrome.storage.local.set({ isCapturing: false });
    stopViewerPolling();
    closeOffscreenDocument();
    return;
  }
  
  return true;
});

async function callEdgeFunction(functionName, body) {
  try {
    const response = await fetch(SUPABASE_URL + '/functions/v1/' + functionName, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error };
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Heartbeat
setInterval(() => {
  console.log('Background: Heartbeat - frames:', framesSent, 'viewer:', lastViewerActive);
}, 25000);
`;

const offscreenHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CRM Pilar - Offscreen Capture</title>
</head>
<body>
  <video id="video" autoplay muted style="display:none;"></video>
  <canvas id="canvas" style="display:none;"></canvas>
  <script src="offscreen.js"></script>
</body>
</html>`;

const offscreenJs = `// Offscreen document for persistent screen capture v2.1.0
let mediaStream = null;
let captureInterval = null;
let currentUserId = null;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

console.log('Offscreen v2.1: Documento carregado');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Offscreen received:', request.action);
  
  if (request.action === 'offscreen-start-capture') {
    currentUserId = request.userId;
    startCapture();
    sendResponse({ success: true });
    
  } else if (request.action === 'offscreen-stop-capture') {
    stopCapture();
    sendResponse({ success: true });
    
  } else if (request.action === 'offscreen-viewer-status') {
    console.log('Offscreen: Viewer status:', request.viewerActive);
    // Apenas log, a captura continua mas background decide se envia
  }
  
  return true;
});

async function startCapture() {
  console.log('Offscreen: Iniciando captura...');
  
  try {
    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: { 
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 1, max: 3 }
      },
      audio: false
    });
    
    console.log('Offscreen: Stream obtido:', mediaStream.getVideoTracks()[0].label);
    
    video.srcObject = mediaStream;
    await video.play();
    
    mediaStream.getVideoTracks()[0].onended = () => {
      console.log('Offscreen: Stream terminado');
      stopCapture();
      chrome.runtime.sendMessage({ action: 'captureError', error: 'Usuário parou' });
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Captura de frames a cada 3 segundos (background decide se envia)
    captureFrame();
    captureInterval = setInterval(captureFrame, 3000);
    
    console.log('Offscreen: Captura iniciada');
    
  } catch (error) {
    console.error('Offscreen: Erro:', error.message);
    chrome.runtime.sendMessage({ action: 'captureError', error: error.message });
  }
}

function captureFrame() {
  if (!video || video.readyState < 2) return;
  
  const ctx = canvas.getContext('2d');
  
  const videoWidth = video.videoWidth || 1920;
  const videoHeight = video.videoHeight || 1080;
  const aspectRatio = videoWidth / videoHeight;
  
  let targetWidth = 1280;
  let targetHeight = Math.round(targetWidth / aspectRatio);
  
  if (targetHeight > 720) {
    targetHeight = 720;
    targetWidth = Math.round(targetHeight * aspectRatio);
  }
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  
  const base64 = canvas.toDataURL('image/jpeg', 0.5);
  
  // Enviar frame para background (ele decide se envia para servidor)
  chrome.runtime.sendMessage({ action: 'sendFrame', frame: base64 });
}

function stopCapture() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  
  video.srcObject = null;
}
`;

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
    .status-row:last-child { margin-bottom: 0; }
    .status-label { font-size: 13px; color: rgba(255,255,255,0.7); }
    .status-value { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.active { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }
    .status-dot.inactive { background: #6b7280; }
    .status-dot.viewing { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .input-group { margin-bottom: 16px; }
    .input-label { display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
    .input-field { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-size: 14px; outline: none; }
    .input-field:focus { border-color: #667eea; }
    .input-field::placeholder { color: rgba(255,255,255,0.4); }
    .btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; transition: transform 0.1s, opacity 0.1s; }
    .btn:hover { opacity: 0.9; }
    .btn:active { transform: scale(0.98); }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .info-box { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .info-text { font-size: 12px; color: #6ee7b7; line-height: 1.4; }
    .footer-text { font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; margin-top: 16px; line-height: 1.5; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">CP</div>
    <div>
      <div class="title">CRM Pilar</div>
      <div class="subtitle">Monitor de Tela v2.1</div>
    </div>
  </div>
  
  <div class="status-card">
    <div class="status-row">
      <span class="status-label">Status</span>
      <span class="status-value">
        <span id="statusDot" class="status-dot inactive"></span>
        <span id="statusText">Inativo</span>
      </span>
    </div>
    <div class="status-row" id="userRow" style="display: none;">
      <span class="status-label">Usuário</span>
      <span class="status-value" id="userIdDisplay">-</span>
    </div>
    <div class="status-row" id="viewerRow" style="display: none;">
      <span class="status-label">Admin visualizando</span>
      <span class="status-value" id="viewerDisplay">Não</span>
    </div>
    <div class="status-row" id="framesRow" style="display: none;">
      <span class="status-label">Frames enviados</span>
      <span class="status-value" id="framesDisplay">0</span>
    </div>
  </div>
  
  <div id="loginSection">
    <div class="input-group">
      <label class="input-label">ID do Usuário (copie do Perfil no CRM)</label>
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
    <div class="info-box">
      <div class="info-text">✓ <strong>Monitoramento ativo em background!</strong><br>Frames só são enviados quando o admin está visualizando sua tela.</div>
    </div>
    <button id="stopBtn" class="btn btn-danger">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="12" height="12"></rect>
      </svg>
      Parar Monitoramento
    </button>
  </div>
  
  <p class="footer-text">Captura sob demanda - economiza recursos quando admin não está visualizando.</p>
  
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
  const viewerRow = document.getElementById('viewerRow');
  const viewerDisplay = document.getElementById('viewerDisplay');
  const framesRow = document.getElementById('framesRow');
  const framesDisplay = document.getElementById('framesDisplay');

  console.log('Popup v2.1: Iniciando...');

  await checkStatus();
  setInterval(checkStatus, 2000);

  async function checkStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
        if (response) {
          updateUI(response.isCapturing, response.userId, response.framesSent, response.viewerActive);
        }
        resolve();
      });
    });
  }

  startBtn.addEventListener('click', async () => {
    const userId = userIdInput.value.trim();
    
    if (!userId) {
      alert('Por favor, insira o ID do usuário');
      return;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      alert('ID de usuário inválido. Copie o ID correto da tela de Perfil.');
      return;
    }
    
    startBtn.disabled = true;
    startBtn.textContent = 'Iniciando...';
    
    chrome.runtime.sendMessage({ action: 'startCapture', userId }, (response) => {
      if (response && response.success) {
        updateUI(true, userId, 0, false);
      } else {
        alert('Erro ao iniciar: ' + (response?.error || 'Erro desconhecido'));
      }
      startBtn.disabled = false;
      startBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> Iniciar Monitoramento';
    });
  });

  stopBtn.addEventListener('click', () => {
    stopBtn.disabled = true;
    stopBtn.textContent = 'Parando...';
    
    chrome.runtime.sendMessage({ action: 'stopCapture' }, (response) => {
      updateUI(false, null, 0, false);
      stopBtn.disabled = false;
      stopBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"></rect></svg> Parar Monitoramento';
    });
  });

  function updateUI(isCapturing, userId, framesSent, viewerActive) {
    if (isCapturing) {
      loginSection.classList.add('hidden');
      activeSection.classList.remove('hidden');
      
      if (viewerActive) {
        statusDot.className = 'status-dot viewing';
        statusText.textContent = 'Transmitindo';
      } else {
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Pronto';
      }
      
      userRow.style.display = 'flex';
      viewerRow.style.display = 'flex';
      framesRow.style.display = 'flex';
      
      if (userId) {
        userIdDisplay.textContent = userId.substring(0, 8) + '...';
        userIdInput.value = userId;
      }
      viewerDisplay.textContent = viewerActive ? 'Sim' : 'Não';
      framesDisplay.textContent = framesSent || 0;
    } else {
      loginSection.classList.remove('hidden');
      activeSection.classList.add('hidden');
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'Inativo';
      userRow.style.display = 'none';
      viewerRow.style.display = 'none';
      framesRow.style.display = 'none';
      
      startBtn.disabled = false;
      startBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> Iniciar Monitoramento';
    }
  }
});`;

// Icons base64
const icon16Base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABBklEQVR4nGNgGAWDBTAyMDDIMjAwKDIwMCgBsQQDAwMjEwMDAx+QvB+o4X+Q1v/A8P+/f/8YGQE2BgYGJaD+/0C6H4j/A9l/gfgPEP8G4l9A/BOIfwDxdyD+BsTfgPgrEH8B4s9A/AmIPwLxByB+D8TvgPgtEL8B4tdA/AqIXwLxCyB+DsTPgPgpED8B4sdA/AiIHwLxAyC+D8T3gPguEN8B4ttAfAuIbwLxDSC+DsTXgPgqEF8B4stAfAmILwLxBSA+D8TngPgsEJ8B4tNAfAqITwLxCSA+DsTHgPgoEB8B4sNAfAiIDwLxASDeD8T7gHgvEO8B4t1AvAuIdwLxDiDeDsRbgXjLKBhsAADj4l+Ov7xzlgAAAABJRU5ErkJggg==';

const icon48Base64 = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAC1klEQVR4nO2Zy2oUQRSGv4wZFBdxIYqIC8GdN9woLnwAH8DgA7hyq6i4ceMT+AKCj+BCwYUbH8BVXLhSQVFEUBQFb4gXYhIzOfKXnKJmuqenpmemkv7h0N1V1ef8p6rOqeoJFChQoMD/DgcYA+4Ak8BHYAFYBuaB98BL4DlwH9gX18ByFNgNXAIm0MXbMuB84BLwINYBFqH1n4EvwIPY7gBOAuvD5M/XqR24ATyvSwD/2r/JXsCE7gV2Ai3A0RjPwHa0A4eAG8Ar4BPwWMfU0b4InAAGBHq7gItK+9u0vk90Cr2K6SdgjmB/ABhS+y0NdP6v0/M3dD6uJ40fVt/1GPoROA08Bj7rObfXMHO3lSYJbAc2A2uA1cAqoFVxq41HGR6S0qJxHRO16JN5Afkd+CQv3QzMqH1SiXYNMW1G7j6GzvVZYJ3anqvPNzXkc5J4ILMEnAEuAB+AX8BTrYEptd8CNqpdz68h3kJiRfcC2Kb1MqH7JvDbZNKIPhd4B5wDXum5X5X+WmPAl3ReAd4DPUC31tgS0G8x6XCa4LQV+CrlJk1SkKBHGXAKeAO0ATuAdmCH1kO/5uqQJulJAzarzzHgmub+pNb4hCb3mzRMqPKwZNvV/zRwWulzQqnvmFJkJw3T+oQmqZRaTQp0K/WdV9+z6ntO/U/rDM2bJE+cEqdbWkJPAt1an/fV90r12a3+p9R/SPMhSeJRCfwC7AX6gB6tzz7gq/p8Ld9YU2z3kib5oJQITAPntN4G1e+0+h5Wv0Pqe0D996v/PupIIxJuqf2b7EF2aQ30aM0NavK3a62fVJ+T6rtPfferX3/SJBN4DRQAPgJDSmyj6ntMfc4o/Y2o7yH1O6B++9VvL3WmEUn3F2JHc7JH63JAiW5c6W9UaW9MfQ6r30H126O+e0mTTMQ9qP2jdWBM62FC62BYa2BI86BP82CAxs2DAgWy4h+59xnB5M5n+wAAAABJRU5ErkJggg==';

const icon128Base64 = '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';

export const useExtensionDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadExtension = async () => {
    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      
      zip.file('manifest.json', manifestJson);
      zip.file('background.js', backgroundJs);
      zip.file('popup.html', popupHtml);
      zip.file('popup.js', popupJs);
      zip.file('offscreen.html', offscreenHtml);
      zip.file('offscreen.js', offscreenJs);
      
      const iconsFolder = zip.folder('icons');
      iconsFolder?.file('icon16.png', icon16Base64, { base64: true });
      iconsFolder?.file('icon48.png', icon48Base64, { base64: true });
      iconsFolder?.file('icon128.png', icon128Base64, { base64: true });
      
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'crm-pilar-monitor-extension-v2.1.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success('Extensão v2.1 baixada! Só envia frames quando admin está visualizando.');
    } catch (error) {
      console.error('Erro ao gerar ZIP:', error);
      toast.error('Erro ao baixar extensão');
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadExtension, isDownloading };
};
