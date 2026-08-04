#!/bin/bash
# Roda dentro do sistema recém-instalado (chroot do d-i).
set -euo pipefail

echo "[appliance] pós-instalação iniciada"

# Sudo sem senha para o operador (permite reiniciar serviços pelo app)
echo "pilar ALL=(ALL) NOPASSWD: /bin/systemctl restart coletor-kiosk, /bin/systemctl stop coletor-kiosk, /bin/systemctl start coletor-kiosk, /opt/coletor/update.sh, /sbin/reboot, /sbin/poweroff" \
  > /etc/sudoers.d/010-coletor
chmod 440 /etc/sudoers.d/010-coletor

install -m 0755 /opt/coletor-src/scripts/install-coletor.sh /tmp/install-coletor.sh
/tmp/install-coletor.sh

echo "[appliance] pós-instalação concluída"
