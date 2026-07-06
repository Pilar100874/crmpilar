#!/usr/bin/env node
// Patch @shinyoshiaki/binary-data — a dependência publica com requires bare
// ("lib/binary-stream", "lib/util", etc.) que só resolvem com resolução TS.
// No runtime do Electron esses paths quebram e derrubam TODO o webrtc-stream
// ("Cannot find module 'lib/binary-stream'"). Reescreve para caminhos
// relativos ("./lib/...") logo após o install para que werift funcione no
// pacote final.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'node_modules', '@shinyoshiaki', 'binary-data');
if (!fs.existsSync(ROOT)) {
  console.log('[patch-binary-data] pacote não encontrado, ignorando');
  process.exit(0);
}

const RE = /require\((['"])((?:lib|src)\/[^'"]+)\1\)/g;
let patched = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) { walk(full); continue; }
    if (!full.endsWith('.js')) continue;
    const src = fs.readFileSync(full, 'utf8');
    const rel = path.relative(path.dirname(full), path.join(ROOT, 'src'));
    const prefix = rel === '' ? '.' : rel.replace(/\\/g, '/');
    const out = src.replace(RE, (_m, q, p) => {
      const stripped = p.replace(/^src\//, '');
      return `require(${q}${prefix}/${stripped}${q})`;
    });
    if (out !== src) {
      fs.writeFileSync(full, out);
      patched++;
    }
  }
}

try {
  walk(ROOT);
  console.log(`[patch-binary-data] arquivos ajustados: ${patched}`);
} catch (e) {
  console.warn('[patch-binary-data] falhou:', e.message);
}
