// Verificador de atualizações do Coletor Desktop.
// Consulta um version.json publicado no CRM e permite baixar/instalar o novo .exe.
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { app, shell } = require('electron');

const VERSION_URL = 'https://crmpilar.lovable.app/coletor/version.json';

function fetchJson(url, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 5) return reject(new Error('muitos redirecionamentos'));
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { timeout: 10000 }, (res) => {
      // segue redirect (302/301/307/308) — necessário para domínios custom da Lovable
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        return fetchJson(next, hops + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function cmpVersion(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

async function checarAtualizacao() {
  const local = app.getVersion();
  try {
    const remoto = await fetchJson(VERSION_URL + '?t=' + Date.now());
    const disponivel = cmpVersion(remoto.version, local) > 0;
    return {
      localVersion: local,
      remoteVersion: remoto.version,
      downloadUrl: remoto.downloadUrl || null,
      notas: remoto.notas || '',
      atualizacaoDisponivel: disponivel,
    };
  } catch (e) {
    return { localVersion: local, erro: e.message };
  }
}

function baixarArquivo(url, destino, onProgress) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destino);
    lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(); fs.unlinkSync(destino);
        return baixarArquivo(res.headers.location, destino, onProgress).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let baixado = 0;
      res.on('data', (chunk) => {
        baixado += chunk.length;
        if (onProgress && total) onProgress(Math.round((baixado / total) * 100));
      });
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(destino)));
    }).on('error', (e) => { try { fs.unlinkSync(destino); } catch {} reject(e); });
  });
}

async function baixarEInstalar(downloadUrl, onProgress) {
  if (!downloadUrl) throw new Error('URL de download não informada');
  const ext = downloadUrl.toLowerCase().endsWith('.msi') ? '.msi' : '.exe';
  const destino = path.join(os.tmpdir(), `ColetorPilar-Setup-${Date.now()}${ext}`);
  await baixarArquivo(downloadUrl, destino, onProgress);

  if (ext === '.msi') {
    // Script PowerShell:
    //  1) Aguarda o app atual encerrar (2s)
    //  2) Desinstala silenciosamente qualquer versão anterior do "Coletor Pilar"
    //     lida no registro do Windows (Add/Remove Programs), tanto x64 quanto x86.
    //  3) Instala a nova versão sem prompt de reboot e suprimindo o Restart Manager
    //     (evita que o Windows peça para reiniciar arquivos em uso).
    const ps = `
      Start-Sleep -Seconds 2
      $paths = @(
        'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
        'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
      )
      Get-ItemProperty $paths -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -like 'Coletor Pilar*' -or $_.DisplayName -like 'ColetorPilar*' } |
        ForEach-Object {
          if ($_.PSChildName -match '^\\{[0-9A-Fa-f-]+\\}$') {
            Start-Process msiexec.exe -ArgumentList '/x',$_.PSChildName,'/qn','/norestart','REBOOT=ReallySuppress','MSIRESTARTMANAGERCONTROL=Disable' -Wait
          }
        }
      Start-Process msiexec.exe -ArgumentList '/i','"${destino.replace(/\\/g, '\\\\')}"','/qb','/norestart','REBOOT=ReallySuppress','MSIRESTARTMANAGERCONTROL=Disable','MSIDISABLERMRESTART=1','REINSTALLMODE=vomus' -Wait
      # Relança o app após instalar — busca em Program Files
      $candidatos = @(
        "$env:ProgramFiles\\ColetorPilar\\ColetorPilar.exe",
        "$env:ProgramFiles(x86)\\ColetorPilar\\ColetorPilar.exe"
      )
      foreach ($exe in $candidatos) {
        if (Test-Path $exe) { Start-Process $exe; break }
      }
      Remove-Item -LiteralPath '${destino.replace(/\\/g, '\\\\')}' -ErrorAction SilentlyContinue
    `.trim();
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn(destino, ['/S'], { detached: true, stdio: 'ignore' }).unref();
  }
  setTimeout(() => { app.isQuitting = true; app.quit(); }, 800);
  return destino;
}


module.exports = { checarAtualizacao, baixarEInstalar };
