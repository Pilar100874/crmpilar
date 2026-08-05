#!/bin/bash
# Roda dentro do sistema recém-instalado (chroot do d-i).
set -euo pipefail

echo "[appliance] pós-instalação iniciada"

# Sudo sem senha para o operador (permite reiniciar serviços pelo app)
echo "pilar ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/010-coletor
chmod 440 /etc/sudoers.d/010-coletor

install -m 0755 /opt/coletor-src/scripts/install-coletor.sh /tmp/install-coletor.sh
/tmp/install-coletor.sh

# Senha em branco: entra direto no Cockpit/SSH sem digitar nada
passwd -d pilar || true

echo "[appliance] pós-instalação concluída"
