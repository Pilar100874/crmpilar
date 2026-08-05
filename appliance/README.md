# Coletor Pilar — Appliance (ISO bootável)

Imagem Debian 12 (Bookworm) que instala automaticamente o sistema operacional +
o **Coletor Pilar** num PC comum, com:

- **Interface gráfica local** — o Coletor abre em modo kiosk (tela cheia) assim que
  a máquina liga, sem login. O operador configura direto na TV/monitor conectado.
- **Acesso remoto** — SSH (porta 22) e **Cockpit** (web em `http://IP:9090`, sem HTTPS,
  sem certificado e sem senha) para administrar a máquina de longe.
- **Wi-Fi** — ISO com firmware non-free (Intel/Realtek/Broadcom/Atheros); no kiosk,
  `F9` abre o gerenciador de redes.
- **Sem login** — o sistema sobe direto na tela gráfica do Coletor; o usuário `pilar`
  tem senha em branco e sudo liberado.
- **Auto-start e auto-recuperação** — serviço systemd reinicia o Coletor se ele cair,
  e a máquina liga sozinha no app após reboot/queda de energia.

```text
┌────────── PC / mini-PC ──────────┐
│ Debian 12 minimal                │
│  ├─ Xorg + openbox (sem desktop) │
│  ├─ coletor-kiosk.service ───────┼──► Electron em tela cheia (GUI local)
│  ├─ sshd            :22          │
│  └─ cockpit         :9090 ───────┼──► administração remota via navegador
└──────────────────────────────────┘
```

## 0. Downloads prontos

- **ISO do appliance** (Debian 12.11 + firmware Wi-Fi + preseed silencioso + kiosk, 966 MB):
  https://crmpilar.lovable.app/__l5e/assets-v1/ccb9a771-07d9-48fe-bb04-60acd6af848f/coletor-pilar-appliance-amd64.iso
- **AppImage Linux do Coletor** (x64, 138 MB):
  https://crmpilar.lovable.app/__l5e/assets-v1/13bc261c-f998-4cd2-9d73-3de090606255/ColetorPilar-Linux.AppImage

Esta ISO já traz o AppImage embutido (instalação offline), autologin sem senha,
Cockpit em HTTP na porta 9090 e instalador com tela única. Para atualizar o app
depois: `sudo /opt/coletor/update.sh`.



## 1. Gerar a ISO você mesmo (opcional)

Precisa de um Linux com `xorriso`, `curl` e `cpio`.

```bash
sudo apt update && sudo apt install -y xorriso curl cpio

cd appliance
sudo ./build-iso.sh          # WORK=/tmp/x OUT=/tmp/y para mudar os diretórios
```

Saída: `appliance/out/coletor-pilar-appliance-amd64.iso`.

Quando `COLETOR_URL` apontar para um AppImage válido, o script o embute na ISO e a
instalação **não precisa de internet** para o app — só para atualizações.


## 2. Gravar no pen drive

```bash
# Linux/macOS
sudo dd if=out/coletor-pilar-appliance-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
```

No Windows use **Rufus** ou **balenaEtcher** (modo imagem DD).

## 3. Instalar no PC

1. Boot pelo pen drive (F12/F11/Del conforme a BIOS).
2. Escolha **"Instalar Coletor Pilar (apaga o disco)"**.
3. A instalação é automática (~10 min): uma única tela com barra de progresso, sem perguntas.
   Se só houver Wi-Fi e a rede não conectar sozinha, o instalador pede SSID/senha uma vez
   (ou preencha `netcfg/wireless_*` no `preseed.cfg` antes de gerar a ISO).
4. A máquina reinicia e abre o Coletor em tela cheia.

Credenciais padrão (troque no primeiro acesso):

| Item          | Valor          |
| ------------- | -------------- |
| Usuário       | `pilar`        |
| Senha         | *(em branco)*  |
| Login local   | automático (sem tela de login) |
| SSH           | `ssh pilar@IP` (senha vazia — só Enter) |
| Cockpit       | `http://IP:9090` (usuário `pilar`, senha vazia) |

> O appliance é feito para rede interna confiável. Para expor na internet,
> defina uma senha (`sudo passwd pilar`), remova
> `/etc/ssh/sshd_config.d/10-coletor.conf` e o `/etc/pam.d/cockpit` customizado.

## 4. Configurar o Coletor

Na tela do próprio appliance (teclado/mouse USB) ou remotamente pelo Cockpit →
**Terminal** → `sudo systemctl restart coletor-kiosk`.

A configuração (URL do projeto, chave anon, login) fica em
`/home/pilar/.config/ColetorPilar/`.

Atalhos do kiosk:

| Tecla        | Ação                          |
| ------------ | ----------------------------- |
| `F11`        | sai/entra em tela cheia       |
| `F12`        | DevTools (log do coletor)     |
| `F9`         | gerenciador de Wi-Fi / redes  |
| `Ctrl+Alt+F2`| console texto (autologin `pilar`) |

## 5. Acesso remoto

- **Cockpit** (recomendado): `http://<ip-do-appliance>:9090` — status, logs,
  rede, terminal e reinício de serviços pelo navegador.
- **SSH**: `ssh pilar@<ip-do-appliance>`
- Logs do coletor: `journalctl -u coletor-kiosk -f`

Para acesso fora da LAN, instale o Tailscale no appliance:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

## 6. Atualizar o Coletor

```bash
sudo /opt/coletor/update.sh     # baixa a última versão publicada no CRM
```

Ou pelo próprio app, no botão **Atualizar** (usa `updater.js`).

## Arquivos

| Arquivo                   | Função                                          |
| ------------------------- | ----------------------------------------------- |
| `build-iso.sh`            | monta a ISO com live-build                      |
| `preseed.cfg`             | instalação Debian desatendida                   |
| `scripts/late-command.sh` | roda dentro do sistema instalado (pós-install)  |
| `scripts/install-coletor.sh` | instala o app, kiosk, systemd e Cockpit      |
| `systemd/coletor-kiosk.service` | serviço que sobe o Xorg + Electron        |
| `config/openbox-rc.xml`   | window manager mínimo, sem decoração            |
