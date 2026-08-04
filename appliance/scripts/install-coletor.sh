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
    cockpit curl ca-certificates fonts-dejavu libnss3 libatk-bridge2.0-0 \
    libgtk-3-0 libgbm1 libasound2 libxss1 libsecret-1-0 chrony
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

# openbox mínimo (sem menus, sem decoração)
cat > "$DEST/openbox-rc.xml" <<'EOS'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <theme><titleLayout></titleLayout></theme>
  <applications>
    <application class="*">
      <decor>no</decor>
      <maximized>yes</maximized>
      <fullscreen>yes</fullscreen>
    </application>
  </applications>
</openbox_config>
EOS

# ── 4. Atualizador ───────────────────────────────────────────────────────
cat > "$DEST/update.sh" <<'EOS'
#!/bin/bash
# Baixa a última versão publicada do Coletor e reinicia o kiosk.
set -euo pipefail
URL="${COLETOR_URL:-https://crmpilar.lovable.app/__l5e/assets-v1/13bc261c-f998-4cd2-9d73-3de090606255/ColetorPilar-Linux.AppImage}"
TMP=$(mktemp)
echo "baixando $URL"
curl -fL --retry 3 -o "$TMP" "$URL"
install -m 0755 "$TMP" /opt/coletor/ColetorPilar.AppImage
rm -f "$TMP"
systemctl restart coletor-kiosk
echo "atualizado"
EOS
chmod +x "$DEST/update.sh"

# ── 5. Serviço systemd ───────────────────────────────────────────────────
cat > /etc/systemd/system/coletor-kiosk.service <<EOS
[Unit]
Description=Coletor Pilar (kiosk)
After=network-online.target systemd-user-sessions.service
Wants=network-online.target

[Service]
User=$USER_APP
PAMName=login
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
StandardInput=tty
StandardOutput=journal
StandardError=journal
Environment=XDG_RUNTIME_DIR=/run/user/1000
ExecStart=/usr/bin/startx /opt/coletor/start-kiosk.sh -- :0 vt1 -keeptty -nolisten tcp
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOS

# Permite startx para usuário comum
if [ -f /etc/X11/Xwrapper.config ]; then
  sed -i 's/^allowed_users=.*/allowed_users=anybody/' /etc/X11/Xwrapper.config
else
  printf 'allowed_users=anybody\nneeds_root_rights=yes\n' > /etc/X11/Xwrapper.config
fi

systemctl set-default graphical.target
systemctl daemon-reload
systemctl enable coletor-kiosk.service
systemctl enable ssh cockpit.socket NetworkManager || true

log "instalação concluída — reinicie para abrir o Coletor"
