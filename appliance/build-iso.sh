#!/bin/bash
# Monta a ISO bootável do Coletor Pilar Appliance (Debian 12 amd64, com firmware Wi-Fi).
# Uso: sudo ./build-iso.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${OUT:-$HERE/out}"
WORK="${WORK:-$HERE/.work}"
# ISO Debian 12 oficial — já inclui firmware non-free (Wi-Fi Intel/Realtek/Broadcom)
DEBIAN_ISO_URL="${DEBIAN_ISO_URL:-https://cdimage.debian.org/cdimage/archive/12.11.0/amd64/iso-cd/debian-12.11.0-amd64-netinst.iso}"
VERSION_URL="${VERSION_URL:-https://crmpilar.lovable.app/coletor/version.json}"
# Sempre a versão publicada no version.json (o "latest" do GitHub pode apontar
# para outro release e acabava gravando uma ISO com versão antiga).
if [ -z "${COLETOR_URL:-}" ]; then
  COLETOR_URL=$(curl -fsSL "$VERSION_URL?t=$(date +%s)" 2>/dev/null \
    | grep -o '"downloadUrlLinux"[^,}]*' | cut -d'"' -f4 || true)
fi
COLETOR_URL="${COLETOR_URL:-https://github.com/Pilar100874/crmpilar/releases/latest/download/ColetorPilar-Linux.AppImage}"
echo "==> Coletor: $COLETOR_URL"

need() { command -v "$1" >/dev/null || { echo "faltando: $1 (apt install $2)"; exit 1; }; }
need xorriso xorriso
need curl curl
need cpio cpio

rm -rf "$WORK"; mkdir -p "$WORK/iso" "$WORK/payload" "$OUT"

echo "==> baixando Debian netinst (com firmware)"
BASE="$WORK/debian.iso"
[ -f "$BASE" ] || curl -fL --retry 3 -o "$BASE" "$DEBIAN_ISO_URL"

echo "==> extraindo ISO"
xorriso -osirrox on -indev "$BASE" -extract / "$WORK/iso" >/dev/null
chmod -R u+w "$WORK/iso"

echo "==> baixando Coletor"
if curl -fL --retry 2 -o "$WORK/payload/coletor.AppImage" "$COLETOR_URL"; then
  chmod +x "$WORK/payload/coletor.AppImage"
else
  echo "AVISO: não foi possível baixar o Coletor; a ISO instalará só o sistema."
  echo "       Rode /opt/coletor/update.sh no appliance depois."
fi

echo "==> embutindo payload e preseed"
mkdir -p "$WORK/iso/coletor" "$WORK/iso/scripts"
cp -r "$WORK/payload/." "$WORK/iso/coletor/" 2>/dev/null || true
cp -r "$HERE/scripts" "$WORK/iso/coletor/scripts"
cp "$HERE/scripts/late-command.sh" "$WORK/iso/scripts/late-command.sh"
cp "$HERE/preseed.cfg" "$WORK/iso/preseed.cfg"
mkdir -p "$WORK/iso/branding"
cp -r "$HERE/branding/." "$WORK/iso/branding/" 2>/dev/null || true

# Preseed também dentro do initrd, para o d-i achar sem rede
echo "==> injetando preseed no initrd"
IRD="$WORK/initrd"; mkdir -p "$IRD"
( cd "$IRD" && gzip -d < "$WORK/iso/install.amd/initrd.gz" | cpio -id --quiet )
cp "$HERE/preseed.cfg" "$IRD/preseed.cfg"
( cd "$IRD" && find . | cpio -o -H newc --quiet | gzip -9 > "$WORK/iso/install.amd/initrd.gz" )

# Parâmetros de kernel: instalação silenciosa, uma única barra de progresso
KOPTS="auto=true priority=critical file=/preseed.cfg \
DEBIAN_FRONTEND=text debian-installer/quiet=true debconf/priority=critical \
theme=dark quiet loglevel=0 plymouth.enable=1 rd.systemd.show_status=false vt.global_cursor_default=0 splash"

echo "==> menu de boot (tela única do instalador)"
mkdir -p "$WORK/iso/isolinux"
cat > "$WORK/iso/isolinux/txt.cfg" <<EOS
default coletor
label coletor
  menu label ^Instalar Coletor Pilar (apaga o disco)
  kernel /install.amd/vmlinuz
  append $KOPTS vga=788 initrd=/install.amd/initrd.gz ---
label rescue
  menu label Modo ^resgate (instalador manual)
  kernel /install.amd/vmlinuz
  append vga=788 initrd=/install.amd/initrd.gz --- quiet
EOS

# Tela de abertura do instalador (sem lista de menus, boot direto em 3s)
cat > "$WORK/iso/isolinux/isolinux.cfg" <<'EOS'
include menu.cfg
default coletor
prompt 0
timeout 30
EOS

cat > "$WORK/iso/isolinux/menu.cfg" <<'EOS'
menu hshift 0
menu width 82
menu title Coletor Pilar - Instalador Automatico
menu tabmsg Instalando o Coletor Pilar... aguarde.
include txt.cfg
EOS

if [ -f "$WORK/iso/boot/grub/grub.cfg" ]; then
  cat > "$WORK/iso/boot/grub/grub.cfg" <<EOS
set default=0
set timeout=3
set timeout_style=hidden
menuentry "Instalar Coletor Pilar (apaga o disco)" {
  linux /install.amd/vmlinuz $KOPTS ---
  initrd /install.amd/initrd.gz
}
menuentry "Modo resgate (instalador manual)" {
  linux /install.amd/vmlinuz --- quiet
  initrd /install.amd/initrd.gz
}
EOS
fi

echo "==> gerando ISO (BIOS + UEFI)"
ISO="$OUT/coletor-pilar-appliance-amd64.iso"
rm -f "$ISO"

MBR=""
for c in "$WORK/iso/isolinux/isohdpfx.bin" /usr/lib/ISOLINUX/isohdpfx.bin /usr/lib/syslinux/mbr/isohdpfx.bin; do
  [ -f "$c" ] && MBR="$c" && break
done

ARGS=(-as mkisofs -r -V "COLETOR_PILAR" -o "$ISO" -J -joliet-long)
[ -n "$MBR" ] && ARGS+=(-isohybrid-mbr "$MBR")
ARGS+=(-c isolinux/boot.cat -b isolinux/isolinux.bin
       -no-emul-boot -boot-load-size 4 -boot-info-table)
if [ -f "$WORK/iso/boot/grub/efi.img" ]; then
  ARGS+=(-eltorito-alt-boot -e boot/grub/efi.img -no-emul-boot)
  [ -n "$MBR" ] && ARGS+=(-isohybrid-gpt-basdat)
fi

xorriso "${ARGS[@]}" "$WORK/iso" || \
xorriso -as mkisofs -r -V "COLETOR_PILAR" -o "$ISO" -J -joliet-long \
  -c isolinux/boot.cat -b isolinux/isolinux.bin \
  -no-emul-boot -boot-load-size 4 -boot-info-table "$WORK/iso"


echo
echo "ISO pronta: $ISO"
ls -lh "$ISO"
echo "Grave com: sudo dd if=$ISO of=/dev/sdX bs=4M status=progress conv=fsync"
