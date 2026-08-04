#!/bin/bash
# Monta a ISO bootável do Coletor Pilar Appliance (Debian 12 amd64).
# Uso: sudo ./build-iso.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/out"
WORK="$HERE/.work"
DEBIAN_ISO_URL="${DEBIAN_ISO_URL:-https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.11.0-amd64-netinst.iso}"
COLETOR_URL="${COLETOR_URL:-https://crmpilar.lovable.app/coletor/ColetorPilar-Linux.AppImage}"

need() { command -v "$1" >/dev/null || { echo "faltando: $1 (apt install $2)"; exit 1; }; }
need xorriso xorriso
need curl curl
need cpio cpio

rm -rf "$WORK"; mkdir -p "$WORK/iso" "$WORK/payload" "$OUT"

echo "==> baixando Debian netinst"
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

# Preseed também dentro do initrd, para o d-i achar sem rede
echo "==> injetando preseed no initrd"
IRD="$WORK/initrd"; mkdir -p "$IRD"
( cd "$IRD" && gzip -d < "$WORK/iso/install.amd/initrd.gz" | cpio -id --quiet )
cp "$HERE/preseed.cfg" "$IRD/preseed.cfg"
( cd "$IRD" && find . | cpio -o -H newc --quiet | gzip -9 > "$WORK/iso/install.amd/initrd.gz" )

echo "==> menu de boot"
mkdir -p "$WORK/iso/isolinux"
cat > "$WORK/iso/isolinux/txt.cfg" <<'EOS'
default coletor
label coletor
  menu label ^Instalar Coletor Pilar (apaga o disco)
  kernel /install.amd/vmlinuz
  append auto=true priority=critical file=/preseed.cfg vga=788 initrd=/install.amd/initrd.gz --- quiet
label rescue
  menu label Modo ^resgate (instalador manual)
  kernel /install.amd/vmlinuz
  append vga=788 initrd=/install.amd/initrd.gz --- quiet
EOS

if [ -f "$WORK/iso/boot/grub/grub.cfg" ]; then
  cat > "$WORK/iso/boot/grub/grub.cfg" <<'EOS'
set default=0
set timeout=5
menuentry "Instalar Coletor Pilar (apaga o disco)" {
  linux /install.amd/vmlinuz auto=true priority=critical file=/preseed.cfg --- quiet
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
