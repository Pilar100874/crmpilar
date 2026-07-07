#!/usr/bin/env node
// Patch @shinyoshiaki/binary-data — a dependência publica com requires bare
// ("lib/binary-stream", "types/array", "internal/meta", etc.) e guarda esses
// módulos dentro de src/node_modules. No pacote final do Electron isso pode ser
// podado ou reescrito para "./lib/...", derrubando TODO o webrtc-stream.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'node_modules', '@shinyoshiaki', 'binary-data');
if (!fs.existsSync(ROOT)) {
  console.log('[patch-binary-data] pacote não encontrado, ignorando');
  process.exit(0);
}

const SRC = path.join(ROOT, 'src');
const NESTED = path.join(SRC, 'node_modules');
const ALIAS_ROOT = SRC;
const RE = /require\((['"])(?:(?:\.\/)?node_modules\/)?((?:lib|types|internal)\/[^'"]+)\1\)/g;
let patched = 0;

function copyDirIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

function ensureCompatibilityAliases() {
  // Tira lib/types/internal de dentro de src/node_modules. O electron-builder
  // pode podar node_modules aninhado no pacote final; mantendo os arquivos em
  // src/lib, src/types e src/internal o WebRTC continua carregando no Windows.
  for (const name of ['lib', 'types', 'internal']) {
    if (copyDirIfExists(path.join(NESTED, name), path.join(SRC, name))) {
      console.log(`[patch-binary-data] alias src/${name} sincronizado`);
    }
  }
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) { walk(full); continue; }
    if (!full.endsWith('.js')) continue;
    const src = fs.readFileSync(full, 'utf8');
    const from = path.dirname(full);
    const out = src.replace(RE, (_m, q, p) => {
      const target = path.join(ALIAS_ROOT, p);
      let rel = path.relative(from, target).replace(/\\/g, '/');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return `require(${q}${rel}${q})`;
    });
    if (out !== src) {
      fs.writeFileSync(full, out);
      patched++;
    }
  }
}

try {
  ensureCompatibilityAliases();
  walk(ROOT);
  console.log(`[patch-binary-data] arquivos ajustados: ${patched}`);
} catch (e) {
  console.warn('[patch-binary-data] falhou:', e.message);
}
