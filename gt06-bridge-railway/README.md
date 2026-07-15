# GT06 Bridge (Railway)

Bridge TCP binário **GT06 → HTTPS** para rastreadores J6, JM01, JM-VL03, GT06N, TK103 e similares.
Recebe posições dos rastreadores e repassa em JSON para sua Edge Function do Supabase (`rastreamento-posicao`).

---

## 🚀 Deploy no Railway (passo a passo)

### 1. Criar o projeto no Railway

1. Acesse [railway.app](https://railway.app) e faça login (com GitHub).
2. Clique em **New Project** → **Empty Project**.
3. Dentro do projeto, clique em **+ New** → **Empty Service**.

### 2. Subir o código

**Opção A — via GitHub (recomendado):**
1. Suba esta pasta `gt06-bridge-railway` para um repositório novo no GitHub.
2. No serviço do Railway: **Settings → Source → Connect Repo** e selecione o repo.

**Opção B — via CLI:**
```bash
npm i -g @railway/cli
railway login
cd gt06-bridge-railway
railway link       # escolha o projeto criado
railway up
```

### 3. Configurar variáveis de ambiente

No serviço, aba **Variables**, adicione:

| Variável | Valor |
|---|---|
| `FORWARD_URL` | `https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/rastreamento-posicao` |
| `FORWARD_TOKEN` | *(opcional)* token Bearer se sua edge function exigir |

⚠️ **NÃO** defina `PORT` manualmente — o Railway injeta automaticamente.

### 4. Expor a porta TCP pública

Railway não expõe TCP arbitrário por padrão. Faça assim:

1. Aba **Settings → Networking → Public Networking**.
2. Clique em **TCP Proxy** (não "Generate Domain", que é HTTP-only).
3. Railway devolve algo como: `containers-us-west-42.railway.app` porta pública `31245`.
4. **Essa é a porta que você configura no rastreador**, não a 5023 interna.

### 5. Configurar o rastreador via SMS

Substitua host/porta pelos que o Railway te deu:

```
APN,smart.m2m.vivo.com.br,vivo,vivo#
SERVER,1,containers-us-west-42.railway.app,31245,0#
TIMER,30,1800#
GPRS,1#
GMT,W,3,0#
```

### 6. Testar

Nos logs do Railway (aba **Deployments → View Logs**) você deve ver:

```
🚀 Bridge GT06 escutando TCP em 0.0.0.0:5023
🔌 Conexão de 187.xx.xx.xx:54321
🔑 Login IMEI=868120210001234
💓 Heartbeat imei=868120210001234
📍 imei=868120210001234 lat=-23.548123 lon=-46.638456 v=0km/h sats=8 fix=true
↗️  Forward OK [200] imei=868120210001234
```

---

## 📡 Formato do JSON enviado para o Supabase

```json
{
  "source": "gt06-bridge",
  "imei": "868120210001234",
  "protocol": "0x12",
  "timestamp": "2026-07-15T14:32:11.000Z",
  "latitude": -23.548123,
  "longitude": -46.638456,
  "speed_kmh": 42,
  "heading": 187,
  "satellites": 8,
  "gps_fixed": true
}
```

Ajuste sua Edge Function `rastreamento-posicao` para aceitar esse formato além do formato OsmAnd (query string) que o app Traccar já envia. O campo `source: "gt06-bridge"` te permite diferenciar.

---

## 🧪 Teste local (sem Railway)

```bash
cd gt06-bridge-railway
npm install
FORWARD_URL="https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/rastreamento-posicao" \
PORT=5023 node server.js
```

Em outra janela, `nc -vz localhost 5023` deve conectar.

---

## 💰 Custo esperado no Railway

- Plano **Hobby**: US$ 5/mês de crédito incluso.
- Este serviço consome ~50 MB RAM e quase zero CPU → cabe folgado no crédito.
- TCP Proxy: sem custo extra.
