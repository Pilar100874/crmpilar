// Controle PTZ via ONVIF (padrão da indústria para câmeras IP).
// Usa a lib 'onvif' que fala SOAP/ONVIF Profile S nas câmeras.
//
// Comandos suportados:
//   move_start (direction: up|down|left|right|zoom_in|zoom_out)
//   move_stop
//   home
//
// Requer que a câmera esteja cadastrada com tem_ptz=true e credenciais ONVIF.

let Onvif = null;
try {
  Onvif = require('onvif').Cam;
} catch (e) {
  console.warn('[onvif] lib não instalada:', e.message);
}

// Cache de conexões ONVIF por camera_id — evita reconectar a cada comando.
const camCache = new Map();

function connect(cam) {
  return new Promise((resolve, reject) => {
    if (!Onvif) return reject(new Error('onvif não instalado (npm i onvif)'));
    if (camCache.has(cam.id)) return resolve(camCache.get(cam.id));
    const client = new Onvif(
      {
        hostname: cam.host,
        username: cam.onvif_user || cam.usuario || 'admin',
        password: cam.onvif_pass || cam.senha || '',
        port: cam.onvif_porta || 80,
        timeout: 5000,
      },
      (err) => {
        if (err) return reject(err);
        camCache.set(cam.id, client);
        resolve(client);
      },
    );
  });
}

function dirToVector(direction, speed) {
  const s = Math.max(0.1, Math.min(1, Number(speed) || 0.5));
  switch (direction) {
    case 'up':       return { x: 0,  y:  s, zoom: 0 };
    case 'down':     return { x: 0,  y: -s, zoom: 0 };
    case 'left':     return { x: -s, y:  0, zoom: 0 };
    case 'right':    return { x:  s, y:  0, zoom: 0 };
    case 'zoom_in':  return { x: 0,  y:  0, zoom:  s };
    case 'zoom_out': return { x: 0,  y:  0, zoom: -s };
    default:         return { x: 0,  y:  0, zoom: 0 };
  }
}

async function ptzHandle(cam, msg) {
  const client = await connect(cam);
  const speed = cam.ptz_velocidade_padrao || 0.5;

  if (msg.action === 'move_start') {
    const v = dirToVector(msg.direction, msg.speed || speed);
    return new Promise((resolve, reject) => {
      client.continuousMove({ x: v.x, y: v.y, zoom: v.zoom }, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }
  if (msg.action === 'move_stop') {
    return new Promise((resolve, reject) => {
      client.stop({ panTilt: true, zoom: true }, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }
  if (msg.action === 'home') {
    return new Promise((resolve, reject) => {
      client.gotoHomePosition({ speed: { x: speed, y: speed, zoom: speed } }, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }
}

module.exports = { ptzHandle };
