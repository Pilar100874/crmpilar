#!/bin/bash
# Roda dentro do sistema recém-instalado (chroot do d-i).
set -euo pipefail

echo "[appliance] pós-instalação iniciada"

# Sudo sem senha para o operador (permite reiniciar serviços pelo app)
echo "pilar ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/010-coletor
chmod 440 /etc/sudoers.d/010-coletor

# ── Tema gráfico (logo + nome + barra única de progresso) ────────────────
if [ -d /opt/coletor-src/branding ]; then
  install -d /usr/share/plymouth/themes/pilar
  cp /opt/coletor-src/branding/pilar.plymouth /usr/share/plymouth/themes/pilar/ 2>/dev/null || true
  cp /opt/coletor-src/branding/pilar.script   /usr/share/plymouth/themes/pilar/ 2>/dev/null || true
  cp /opt/coletor-src/branding/logo.png       /usr/share/plymouth/themes/pilar/ 2>/dev/null || true
  cp /opt/coletor-src/branding/bar-bg.png     /usr/share/plymouth/themes/pilar/ 2>/dev/null || true
  cp /opt/coletor-src/branding/bar-fill.png   /usr/share/plymouth/themes/pilar/ 2>/dev/null || true
  plymouth-set-default-theme pilar 2>/dev/null || true
  update-initramfs -u 2>/dev/null || true
fi

install -m 0755 /opt/coletor-src/scripts/install-coletor.sh /tmp/install-coletor.sh
/tmp/install-coletor.sh

# Senha em branco: entra direto no Cockpit/SSH sem digitar nada
passwd -d pilar || true

# ── Aviso de fim: retirar o pen drive ────────────────────────────────────
cat > /etc/issue <<'EOS'

  ============================================================
   Coletor Pilar instalado com sucesso.
   RETIRE O PEN DRIVE / MÍDIA DE INSTALAÇÃO antes de reiniciar.
  ============================================================

EOS

echo "[appliance] pós-instalação concluída — RETIRE O PEN DRIVE"
