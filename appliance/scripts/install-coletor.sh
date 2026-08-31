#!/bin/bash
# Instala o Coletor Pilar como appliance kiosk.
# Idempotente: pode ser rodado num Debian já existente para converter em appliance.
set -euo pipefail

SRC="${SRC:-/opt/coletor-src}"          # payload copiado da ISO
DEST=/opt/coletor
USER_APP="${USER_APP:-pilar}"

log() { echo "[coletor-install] $*"; }

# ── 1. Dependências (caso rode fora do preseed) ──────────────────────────
if ! command -v openbox >/dev/null 2>&1; then
  log "instalando dependências"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends \
    xserver-xorg xinit openbox unclutter x11-xserver-utils network-manager \
    network-manager-gnome wireless-tools wpasupplicant iw rfkill \
    cockpit curl ca-certificates fonts-dejavu ffmpeg libnss3 libatk-bridge2.0-0 \
    libgtk-3-0 libgbm1 libasound2 libxss1 libsecret-1-0 chrony || true
fi

# ── 2. Aplicação ─────────────────────────────────────────────────────────
mkdir -p "$DEST"
if [ -d "$SRC/app" ]; then
  log "copiando aplicação de $SRC/app"
  cp -r "$SRC/app/." "$DEST/"
elif [ -f "$SRC/coletor.AppImage" ]; then
  log "instalando AppImage"
  install -m 0755 "$SRC/coletor.AppImage" "$DEST/ColetorPilar.AppImage"
else
  log "AVISO: nenhum payload encontrado em $SRC — use /opt/coletor/update.sh depois"
fi
chown -R "$USER_APP":"$USER_APP" "$DEST"

# ── 3. Launcher ──────────────────────────────────────────────────────────
cat > "$DEST/start-kiosk.sh" <<'EOS'
#!/bin/bash
# Sobe Xorg + openbox e abre o Coletor em tela cheia.
set -u
export DISPLAY=:0
export ELECTRON_DISABLE_SECURITY_WARNINGS=1

xset s off -dpms s noblank || true
unclutter -idle 3 -root &
openbox --config-file /opt/coletor/openbox-rc.xml &

# Applet de rede (Wi-Fi) disponível no kiosk
command -v nm-applet >/dev/null && nm-applet --indicator &

FLAGS="--kiosk --no-sandbox --disable-gpu-compositing --force-device-scale-factor=1"
if [ -x /opt/coletor/ColetorPilar.AppImage ]; then
  exec /opt/coletor/ColetorPilar.AppImage $FLAGS
elif [ -x /opt/coletor/ColetorPilar ]; then
  exec /opt/coletor/ColetorPilar $FLAGS
else
  exec /opt/coletor/coletor $FLAGS
fi
EOS
chmod +x "$DEST/start-kiosk.sh"

# openbox mínimo (sem menus, sem decoração) + atalho de Wi-Fi (F9)
cat > "$DEST/openbox-rc.xml" <<'EOS'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <theme><titleLayout></titleLayout></theme>
  <keyboard>
    <keybind key="F9">
      <action name="Execute"><command>nm-connection-editor</command></action>
    </keybind>
  </keyboard>
  <applications>
    <application class="*">
      <decor>no</decor>
      <maximized>yes</maximized>
      <fullscreen>yes</fullscreen>
    </application>
    <application name="nm-connection-editor">
      <decor>yes</decor><maximized>no</maximized><fullscreen>no</fullscreen>
    </application>
  </applications>
</openbox_config>
EOS
# ── 4. Atualizador ───────────────────────────────────────────────────────
cat > "$DEST/update.sh" <<'EOS'
#!/bin/bash
# Baixa a última versão publicada do Coletor e reinicia o kiosk.
# Uso: sudo /opt/coletor/update.sh [URL]
# Preserva TODAS as configurações (unidade, câmeras ligadas, portaria etc.),
# que ficam em ~/.ponto-coletor.json e em /opt/coletor/config/.
set -uo pipefail
LOG=/var/log/coletor-update.log
exec >> "$LOG" 2>&1
echo "===== $(date -Is) iniciando atualização ====="

VERSION_URL="https://crmpilar.lovable.app/coletor/version.json"
USER_APP_DEF="pilar"

URL="${1:-${COLETOR_URL:-}}"
if [ -z "$URL" ]; then
  URL=$(curl -fsSL "$VERSION_URL?t=$(date +%s)" 2>/dev/null \
        | grep -o '"downloadUrlLinux"[^,}]*' | cut -d'"' -f4 || true)
fi
if [ -z "$URL" ]; then
  echo "ERRO: não foi possível descobrir a URL de download"; exit 1
fi

# ── Backup das configurações (nunca se perdem numa atualização) ─────────
CFG_HOME="/home/$USER_APP_DEF/.ponto-coletor.json"
CFG_DIR=/opt/coletor/config
mkdir -p "$CFG_DIR"
# Guarda a cópia mais recente entre HOME e os espelhos
NEWEST=$(ls -t "$CFG_HOME" "$CFG_DIR/ponto-coletor.json" "$CFG_DIR/ponto-coletor.json.bak" 2>/dev/null | head -n1 || true)
if [ -n "$NEWEST" ]; then
  cp -f "$NEWEST" "$CFG_DIR/ponto-coletor.json"
  cp -f "$NEWEST" "$CFG_DIR/ponto-coletor.json.bak"
fi

TMP=$(mktemp /tmp/ColetorPilar-XXXXXX.AppImage)
echo "baixando $URL"
if ! curl -fL --retry 3 --connect-timeout 20 -o "$TMP" "$URL"; then
  echo "ERRO: download falhou — mantendo a versão atual"; rm -f "$TMP"; exit 1
fi

# Validação: precisa ser um AppImage (ELF) e ter tamanho plausível
TAM=$(stat -c%s "$TMP" 2>/dev/null || echo 0)
if [ "$TAM" -lt 20000000 ] || ! head -c 4 "$TMP" | grep -q "ELF"; then
  echo "ERRO: arquivo inválido (${TAM} bytes) — mantendo a versão atual"; rm -f "$TMP"; exit 1
fi

install -m 0755 "$TMP" /opt/coletor/ColetorPilar.AppImage
chown "$USER_APP_DEF":"$USER_APP_DEF" /opt/coletor/ColetorPilar.AppImage 2>/dev/null || true
rm -f "$TMP"

# Remove binários desempacotados antigos que poderiam continuar sendo abertos
rm -f /opt/coletor/ColetorPilar /opt/coletor/coletor 2>/dev/null || true

# Restaura as configurações caso algo as tenha removido
if [ ! -f "$CFG_HOME" ] && [ -f /opt/coletor/config/ponto-coletor.json.bak ]; then
  cp -f /opt/coletor/config/ponto-coletor.json.bak "$CFG_HOME"
  chown "$USER_APP_DEF":"$USER_APP_DEF" "$CFG_HOME"
fi

echo "instalado: $(ls -l /opt/coletor/ColetorPilar.AppImage)"
systemctl restart coletor-kiosk
echo "===== $(date -Is) atualização concluída ====="
EOS
chmod +x "$DEST/update.sh"

# Permite que o app (usuário sem privilégios) dispare a atualização sem senha —
# usado pelo botão da tela do aplicativo e pelo comando remoto do CRM.
cat > /etc/sudoers.d/coletor-update <<EOS
$USER_APP ALL=(root) NOPASSWD: /opt/coletor/update.sh, /opt/coletor/update.sh *
EOS
chmod 0440 /etc/sudoers.d/coletor-update


# ── 5. Serviço systemd (sem login, direto no gráfico) ────────────────────
cat > /etc/systemd/system/coletor-kiosk.service <<EOS
[Unit]
Description=Coletor Pilar (kiosk)
After=network-online.target systemd-user-sessions.service
Wants=network-online.target
Conflicts=getty@tty1.service
After=getty@tty1.service

[Service]
User=$USER_APP
Group=$USER_APP
PAMName=login
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
StandardInput=tty
StandardOutput=journal
StandardError=journal
Environment=XDG_RUNTIME_DIR=/run/user/1000
Environment=XDG_SESSION_TYPE=x11
ExecStart=/usr/bin/startx /opt/coletor/start-kiosk.sh -- :0 vt1 -keeptty -nolisten tcp
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOS

# getty do tty1 desativado — nada de prompt de login piscando na tela
systemctl disable getty@tty1.service 2>/dev/null || true
systemctl mask getty@tty1.service 2>/dev/null || true

# Autologin no tty2 (console de emergência, sem digitar senha)
mkdir -p /etc/systemd/system/getty@tty2.service.d
cat > /etc/systemd/system/getty@tty2.service.d/autologin.conf <<EOS
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $USER_APP --noclear %I \$TERM
EOS

# Permite startx para usuário comum
if [ -f /etc/X11/Xwrapper.config ]; then
  sed -i 's/^allowed_users=.*/allowed_users=anybody/' /etc/X11/Xwrapper.config
else
  printf 'allowed_users=anybody\nneeds_root_rights=yes\n' > /etc/X11/Xwrapper.config
fi

# ── 6. Cockpit sem HTTPS e sem senha ─────────────────────────────────────
mkdir -p /etc/cockpit
cat > /etc/cockpit/cockpit.conf <<'EOS'
[WebService]
AllowUnencrypted = true
LoginTitle = Coletor Pilar
LoginTo = false
EOS

# PAM: acesso direto (usuário "pilar", senha em branco)
cat > /etc/pam.d/cockpit <<EOS
auth       requisite  pam_succeed_if.so user = $USER_APP
auth       required   pam_permit.so
account    required   pam_permit.so
password   required   pam_permit.so
session    required   pam_permit.so
session    optional   pam_systemd.so
EOS

# Cockpit escutando em HTTP puro (porta 9090)
mkdir -p /etc/systemd/system/cockpit.socket.d
cat > /etc/systemd/system/cockpit.socket.d/listen.conf <<'EOS'
[Socket]
ListenStream=
ListenStream=9090
EOS

# ── 7. SSH sem senha para o operador ─────────────────────────────────────
mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/10-coletor.conf <<EOS
PermitEmptyPasswords yes
PasswordAuthentication yes
AllowUsers $USER_APP
EOS

# ── 8. Rede: NetworkManager gerencia tudo (inclusive Wi-Fi) ──────────────
mkdir -p /etc/NetworkManager/conf.d
printf '[main]\nplugins=ifupdown,keyfile\n\n[ifupdown]\nmanaged=true\n' \
  > /etc/NetworkManager/conf.d/10-coletor.conf
rfkill unblock all 2>/dev/null || true

systemctl set-default graphical.target
systemctl daemon-reload
systemctl enable coletor-kiosk.service
systemctl enable ssh cockpit.socket NetworkManager || true

# ffmpeg e obrigatorio para snapshot RTSP das cameras
if ! command -v ffmpeg >/dev/null 2>&1; then
  log "instalando ffmpeg (snapshot RTSP)"
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ffmpeg || \
    log "AVISO: ffmpeg nao pode ser instalado - snapshots RTSP ficarao indisponiveis"
fi

log "instalação concluída — reinicie para abrir o Coletor"
