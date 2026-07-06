const fs = require('fs');
const path = require('path');

function copyDirIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

module.exports = async function afterPack(context) {
  // O pacote @shinyoshiaki/binary-data usa requires absolutos como
  // require('lib/binary-stream') e guarda esses arquivos dentro de
  // src/node_modules. Alguns passos do electron-builder podam esse diretório
  // aninhado; sem ele, o live stream WebRTC não carrega no Windows instalado.
  const src = path.join(
    context.appDir,
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
    console.log('[afterPack] binary-data src/node_modules preservado');
  } else {
    console.warn('[afterPack] binary-data src/node_modules não encontrado em', src);
  }
};