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
    lib.get(url, {
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }, (res) => {
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

function urlExiste(url, hops = 0) {
  return new Promise((resolve) => {
    if (!url || hops > 5) return resolve(false);
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        res.resume();
        return urlExiste(next, hops + 1).then(resolve);
      }
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.end();
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
    let disponivel = cmpVersion(remoto.version, local) > 0;
    const downloadUrl = remoto.downloadUrl || null;

    // Se o GitHub/release foi removido, não mostra falso aviso de atualização.
    if (disponivel && !(await urlExiste(downloadUrl))) {
      disponivel = false;
    }

    return {
      localVersion: local,
      remoteVersion: remoto.version,
      downloadUrl,
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

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function baixarEInstalar(downloadUrl, onProgress) {
  if (!downloadUrl) throw new Error('URL de download não informada');
  const ext = downloadUrl.toLowerCase().endsWith('.msi') ? '.msi' : '.exe';
  const destino = path.join(os.tmpdir(), `ColetorPilar-Setup-${Date.now()}${ext}`);
  await baixarArquivo(downloadUrl, destino, onProgress);

  // Log de instalação para diagnóstico caso algo falhe silenciosamente.
  const logPath = path.join(os.tmpdir(), `ColetorPilar-Install-${Date.now()}.log`);
  // Grava o script em arquivo .ps1 e executa via `-File`.
  // Motivo: passar scripts multilinha via `-Command` sofre com re-parse do Windows
  // (aspas, backslashes, `&`, `(` viram problemas). Com `-File` o PowerShell lê
  // o arquivo cru — sem escape de backslashes, caminhos do Windows funcionam.
  const scriptPath = path.join(os.tmpdir(), `ColetorPilar-Install-${Date.now()}.ps1`);
  const appPid = process.pid;
  const installerPathPs = psQuote(destino);
  const logPathPs = psQuote(logPath);
  const scriptPathPs = psQuote(scriptPath);
  const commonPsHeader = `
$ErrorActionPreference = 'Continue'
$InstallerPath = ${installerPathPs}
$LogPath = ${logPathPs}
$AppPid = ${appPid}

function Test-ColetorAdmin {
  try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch { return $false }
}

if (-not (Test-ColetorAdmin)) {
  try {
    Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',${scriptPathPs}) -Verb RunAs -ErrorAction Stop
  } catch {
    try {
      Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
      [System.Windows.Forms.MessageBox]::Show('A atualização precisa de permissão do Windows (UAC). Clique em Sim quando o Windows solicitar permissão para instalar.','Coletor Pilar - Atualização',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning,[System.Windows.Forms.MessageBoxDefaultButton]::Button1,[System.Windows.Forms.MessageBoxOptions]::DefaultDesktopOnly) | Out-Null
    } catch {}
  }
  exit
}

Start-Transcript -Path $LogPath -Append | Out-Null
Write-Host "Log: $LogPath"
Write-Host "Aguardando o Coletor fechar. PID: $AppPid"
try { Wait-Process -Id $AppPid -Timeout 30 -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Seconds 2
try {
  Get-Process ColetorPilar,ponto-coletor -ErrorAction SilentlyContinue |
    Where-Object { $_.Id -ne $PID } |
    Stop-Process -Force -ErrorAction SilentlyContinue
} catch {}
Start-Sleep -Seconds 1
`.trim();

  let ps;
  if (ext === '.msi') {
    ps = `
${commonPsHeader}
Write-Host "Instalando MSI: $InstallerPath"

$paths = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)
Get-ItemProperty $paths -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -like 'Coletor Pilar*' -or $_.DisplayName -like 'ColetorPilar*' } |
  ForEach-Object {
    if ($_.PSChildName -match '^\\{[0-9A-Fa-f-]+\\}$') {
      Write-Host "Desinstalando versão anterior: $($_.PSChildName)"
      Start-Process msiexec.exe -ArgumentList '/x',$_.PSChildName,'/qn','/norestart','REBOOT=ReallySuppress','MSIRESTARTMANAGERCONTROL=Disable' -Wait
    }
  }

$msiArgs = @('/i',$InstallerPath,'/qb','/norestart','REBOOT=ReallySuppress','MSIRESTARTMANAGERCONTROL=Disable','MSIDISABLERMRESTART=1','REINSTALLMODE=vomus')
$proc = Start-Process msiexec.exe -ArgumentList $msiArgs -Wait -PassThru
Write-Host "msiexec exit code: $($proc.ExitCode)"

$candidatos = @(
  "$env:ProgramFiles\\ColetorPilar\\ColetorPilar.exe",
  "\${env:ProgramFiles(x86)}\\ColetorPilar\\ColetorPilar.exe"
)
foreach ($exe in $candidatos) {
  if (Test-Path $exe) { Start-Process $exe; break }
}
Remove-Item -LiteralPath $InstallerPath -ErrorAction SilentlyContinue

try {
  Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
  $owner = New-Object System.Windows.Forms.Form
  $owner.TopMost = $true
  $owner.StartPosition = 'CenterScreen'
  $owner.Size = New-Object System.Drawing.Size(1,1)
  $owner.ShowInTaskbar = $false
  $owner.Opacity = 0
  $owner.Show()
  [System.Windows.Forms.MessageBox]::Show($owner,'O Coletor Pilar foi instalado/atualizado com sucesso e já está em execução.','Coletor Pilar - Instalação concluída',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Information,[System.Windows.Forms.MessageBoxDefaultButton]::Button1,[System.Windows.Forms.MessageBoxOptions]::DefaultDesktopOnly) | Out-Null
  $owner.Close()
} catch {
  try {
    Add-Type -AssemblyName PresentationFramework -ErrorAction Stop
    [System.Windows.MessageBox]::Show('O Coletor Pilar foi instalado/atualizado com sucesso e já está em execução.','Coletor Pilar - Instalação concluída','OK','Information') | Out-Null
  } catch {}
}
Stop-Transcript | Out-Null
`.trim();
  } else {
    ps = `
${commonPsHeader}
Write-Host "Instalando EXE: $InstallerPath"
# O script inteiro já foi elevado via UAC antes de chegar aqui.
# Assim o /S do NSIS perMachine consegue instalar de verdade.
try {
  $proc = Start-Process -FilePath $InstallerPath -ArgumentList '/S' -Wait -PassThru -ErrorAction Stop
  Write-Host "Setup exit code (silent): $($proc.ExitCode)"
  if ($proc.ExitCode -ne 0) { throw "Setup silent retornou codigo $($proc.ExitCode)" }
} catch {
  Write-Host "Modo silencioso falhou: $($_.Exception.Message)"
  Write-Host "Abrindo instalador interativo..."
  try {
    $proc = Start-Process -FilePath $InstallerPath -Wait -PassThru -ErrorAction Stop
    Write-Host "Setup exit code (interactive): $($proc.ExitCode)"
  } catch {
    Write-Host "Instalacao cancelada pelo usuario: $($_.Exception.Message)"
  }
}

$candidatos = @(
  "$env:ProgramFiles\\ColetorPilar\\ColetorPilar.exe",
  "\${env:ProgramFiles(x86)}\\ColetorPilar\\ColetorPilar.exe"
)
foreach ($exe in $candidatos) {
  if (Test-Path $exe) { Start-Process $exe; break }
}
Remove-Item -LiteralPath $InstallerPath -ErrorAction SilentlyContinue

try {
  Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
  $owner = New-Object System.Windows.Forms.Form
  $owner.TopMost = $true
  $owner.StartPosition = 'CenterScreen'
  $owner.Size = New-Object System.Drawing.Size(1,1)
  $owner.ShowInTaskbar = $false
  $owner.Opacity = 0
  $owner.Show()
  [System.Windows.Forms.MessageBox]::Show($owner,'O Coletor Pilar foi instalado/atualizado com sucesso.','Coletor Pilar - Instalação concluída',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Information,[System.Windows.Forms.MessageBoxDefaultButton]::Button1,[System.Windows.Forms.MessageBoxOptions]::DefaultDesktopOnly) | Out-Null
  $owner.Close()
} catch {
  try {
    Add-Type -AssemblyName PresentationFramework -ErrorAction Stop
    [System.Windows.MessageBox]::Show('O Coletor Pilar foi instalado/atualizado com sucesso.','Coletor Pilar - Instalação concluída','OK','Information') | Out-Null
  } catch {}
}
Stop-Transcript | Out-Null
`.trim();
  }

  // BOM UTF-8 garante que PowerShell interprete acentos corretamente.
  fs.writeFileSync(scriptPath, '\ufeff' + ps, { encoding: 'utf8' });

  spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    { detached: true, stdio: 'ignore', windowsHide: false }
  ).unref();

  setTimeout(() => { app.isQuitting = true; app.quit(); }, 800);
  return destino;
}


module.exports = { checarAtualizacao, baixarEInstalar };
