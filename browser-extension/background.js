// Background service worker for screen monitoring
const SUPABASE_URL = 'https://ioxugupvxlcdweldocmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc';

let mediaStream = null;
let captureInterval = null;
let userId = null;
let broadcastChannel = null;

// Listen for messages from popup
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
    // Use desktopCapture API for silent screen capture
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      async (streamId) => {
        if (!streamId) {
          console.log('User cancelled screen selection');
          return;
        }

        try {
          // Get the media stream using the granted stream ID
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: streamId
              }
            }
          });

          // Start capturing frames
          startFrameCapture();
          
          // Update consent status in database
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
  
  // Initialize Supabase channel for broadcasting
  initBroadcastChannel();

  // Capture frame every 3 seconds
  captureInterval = setInterval(async () => {
    try {
      const bitmap = await imageCapture.grabFrame();
      
      // Create canvas and draw the frame
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      
      // Scale down for better performance
      const scaledCanvas = new OffscreenCanvas(1280, 720);
      const scaledCtx = scaledCanvas.getContext('2d');
      scaledCtx.drawImage(canvas, 0, 0, 1280, 720);
      
      // Convert to blob then base64
      const blob = await scaledCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      // Broadcast the frame
      await broadcastFrame(base64);
      
      // Update last frame timestamp
      await updateLastFrameTimestamp();
      
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  }, 3000);
}

function initBroadcastChannel() {
  // Create a WebSocket connection to Supabase Realtime
  const wsUrl = `wss://ioxugupvxlcdweldocmq.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;
  
  broadcastChannel = new WebSocket(wsUrl);
  
  broadcastChannel.onopen = () => {
    console.log('Broadcast channel connected');
    
    // Join the channel
    const joinMessage = {
      topic: `realtime:screen-share-${userId}`,
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
    topic: `realtime:screen-share-${userId}`,
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
    const response = await fetch(`${SUPABASE_URL}/rest/v1/screen_monitor_consent?usuario_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        is_sharing: isSharing,
        updated_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error('Error updating consent status');
    }
  } catch (error) {
    console.error('Error updating consent status:', error);
  }
}

async function updateLastFrameTimestamp() {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/screen_monitor_consent?usuario_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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

// Clean up on extension unload
chrome.runtime.onSuspend.addListener(() => {
  stopScreenCapture();
});
