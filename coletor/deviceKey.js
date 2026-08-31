// Chave única do equipamento (gerada localmente, persistida no home do usuário).
// Usada para comandos remotos do CRM e para o auto-registro da Portaria.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const KEY_PATH = path.join(os.homedir(), '.coletor-device-key');

function deviceKey() {
  try {
    if (fs.existsSync(KEY_PATH)) {
      const k = fs.readFileSync(KEY_PATH, 'utf-8').trim();
      if (k) return k;
    }
  } catch {}
  const nova = crypto.randomUUID();
  try { fs.writeFileSync(KEY_PATH, nova, { mode: 0o600 }); } catch {}
  return nova;
}

module.exports = { deviceKey, KEY_PATH };
