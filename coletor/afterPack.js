const fs = require('fs');
const path = require('path');

function copyDirIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

function walkJs(dir, visitor) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) { walkJs(full, visitor); continue; }
    if (full.endsWith('.js')) visitor(full);
  }
}

function normalizeBinaryData(root) {
  const src = path.join(root, 'src');
  const nested = path.join(src, 'node_modules');
  const aliasRoot = src;
  for (const name of ['lib', 'types', 'internal']) {
    copyDirIfExists(path.join(nested, name), path.join(src, name));
  }

  const re = /require\((['"])((?:lib|types|internal)\/[^'"]+)\1\)/g;
  let patched = 0;
  walkJs(root, (file) => {
    const input = fs.readFileSync(file, 'utf8');
    const output = input.replace(re, (_m, q, p) => {
      const target = path.join(aliasRoot, p);
      let rel = path.relative(path.dirname(file), target).replace(/\\/g, '/');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return `require(${q}${rel}${q})`;
    });
    if (output !== input) {
      fs.writeFileSync(file, output);
      patched++;
    }
  });
  console.log('[afterPack] binary-data normalizado; arquivos ajustados:', patched);
}

module.exports = async function afterPack(context) {
  // O pacote @shinyoshiaki/binary-data usa requires absolutos como
  // require('lib/binary-stream') e guarda esses arquivos dentro de
  // src/node_modules. Alguns passos do electron-builder podam esse diretório
  // aninhado; por isso também normalizamos para src/lib, src/types e
  // src/internal, que não são podados.
  //
  // Em electron-builder 24 o campo `context.appDir` foi removido —
  // usamos o projectDir do packager (raiz do projeto) como fallback.
  const projectDir =
    context.packager?.info?.projectDir ||
    context.packager?.projectDir ||
    process.cwd();

  const src = path.join(
    projectDir,
    'node_modules',
    '@shinyoshiaki',
    'binary-data',
    'src',
    'node_modules',
  );
  const dest = path.join(
    context.appOutDir,
    'resources',
    'app',
    'node_modules',
    '@shinyoshiaki',
    'binary-data',
    'src',
    'node_modules',
  );

  if (copyDirIfExists(src, dest)) {
    console.log('[afterPack] binary-data src/node_modules preservado a partir de', src);
  } else {
    console.warn('[afterPack] binary-data src/node_modules não encontrado em', src);
  }

  const packagedRoot = path.join(
    context.appOutDir,
    'resources',
    'app',
    'node_modules',
    '@shinyoshiaki',
    'binary-data',
  );
  if (fs.existsSync(packagedRoot)) {
    normalizeBinaryData(packagedRoot);
  } else {
    console.warn('[afterPack] binary-data não encontrado no app empacotado em', packagedRoot);
  }
};