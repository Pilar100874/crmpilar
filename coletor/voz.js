// Pilar Voz embutido no Coletor: registra o ramal da IA na central (SIP/UDP),
// atende e faz ligações em PCMU, conversa usando a IA do CRM (função
// voz-dispositivo) e transfere com REFER. Mesmo comportamento do app Android.
const dgram = require('dgram');
const crypto = require('crypto');
const { loadConfig, saveConfig } = require('./collector');

const LIMIAR_FALA = 700;

// ─── Fila assíncrona com tempo limite ────────────────────────────────────
class Fila {
  constructor() { this.itens = []; this.esperas = []; }
  push(x) { const w = this.esperas.shift(); if (w) { clearTimeout(w.t); w.r(x); } else this.itens.push(x); }
  pop(ms) {
    if (this.itens.length) return Promise.resolve(this.itens.shift());
    return new Promise((r) => {
      const w = { r, t: setTimeout(() => { this.esperas = this.esperas.filter((e) => e !== w); r(null); }, ms) };
      this.esperas.push(w);
    });
  }
  clear() { this.itens = []; }
  get size() { return this.itens.length; }
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = () => crypto.randomUUID();
const tag = () => uid().slice(0, 10);
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

// ─── Áudio: µ-law ⇄ PCM 16 bits e WAV ────────────────────────────────────
function ulawParaPcm(u) {
  const v = ~u & 0xff; const sinal = v & 0x80; const exp = (v >> 4) & 7; const man = v & 0x0f;
  let a = ((man << 3) + 0x84) << exp; a -= 0x84;
  return sinal ? -a : a;
}
function pcmParaUlaw(s) {
  const sinal = s < 0 ? 0x80 : 0; let p = Math.min(Math.abs(s), 32635) + 0x84;
  let exp = 7; let m = 0x4000;
  while (exp > 0 && (p & m) === 0) { exp--; m >>= 1; }
  const man = (p >> (exp + 3)) & 0x0f;
  return ~(sinal | (exp << 4) | man) & 0xff;
}
const energia = (pcm) => { if (!pcm.length) return 0; let t = 0; for (const x of pcm) t += Math.abs(x); return t / pcm.length; };
function wav8k(pcm) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write('RIFF', 0); b.writeInt32LE(36 + pcm.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeInt32LE(16, 16); b.writeInt16LE(1, 20); b.writeInt16LE(1, 22); b.writeInt32LE(8000, 24); b.writeInt32LE(16000, 28);
  b.writeInt16LE(2, 32); b.writeInt16LE(16, 34); b.write('data', 36); b.writeInt32LE(pcm.length * 2, 40);
  pcm.forEach((v, i) => b.writeInt16LE(Math.max(-32768, Math.min(32767, v)), 44 + i * 2));
  return b;
}
function wavPara8k(b64) {
  const b = Buffer.from(b64, 'base64');
  let taxa = 24000; let canais = 1; let pos = 12; let ini = 44; let tam = b.length - 44;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4); const t = b.readInt32LE(pos + 4);
    if (id === 'fmt ') { canais = b.readInt16LE(pos + 10); taxa = b.readInt32LE(pos + 12); }
    if (id === 'data') { ini = pos + 8; tam = Math.min(t <= 0 ? b.length - ini : t, b.length - ini); break; }
    pos += 8 + t;
  }
  const n = Math.floor(tam / 2 / canais);
  const mono = new Int16Array(n); for (let i = 0; i < n; i++) mono[i] = b.readInt16LE(ini + i * 2 * canais);
  if (taxa === 8000) return mono;
  const out = new Int16Array(Math.floor(n * 8000 / taxa));
  for (let i = 0; i < out.length; i++) out[i] = mono[Math.min(n - 1, Math.floor(i * taxa / 8000))];
  return out;
}

// ─── API do CRM ──────────────────────────────────────────────────────────
async function api(acao, extra = {}) {
  const cfg = loadConfig();
  const v = cfg.voz || {};
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 90_000);
  try {
    const resp = await fetch(`${cfg.url}/functions/v1/voz-dispositivo`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` },
      // Sem chave específica da voz, usa a chave de instalação do Coletor.
      body: JSON.stringify({ ...extra, chave: String(v.chave || cfg.chaveEmpresa || '').trim().toUpperCase(), acao }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json.error || `Erro ${resp.status}`);
    return json;
  } finally { clearTimeout(t); }
}
const silencioso = (p) => p.catch(() => null);

// ─── SIP ─────────────────────────────────────────────────────────────────
const CURTOS = { v: 'via', f: 'from', t: 'to', i: 'call-id', m: 'contact', l: 'content-length', c: 'content-type' };
function lerSip(txt) {
  const sep = txt.indexOf('\r\n\r\n');
  const cabTxt = sep >= 0 ? txt.slice(0, sep) : txt;
  const corpo = sep >= 0 ? txt.slice(sep + 4) : '';
  const linhas = cabTxt.split('\r\n'); if (!linhas.length) return null;
  const cab = {};
  linhas.slice(1).forEach((l) => {
    const i = l.indexOf(':'); if (i <= 0) return;
    let n = l.slice(0, i).trim().toLowerCase(); n = CURTOS[n] || n;
    (cab[n] = cab[n] || []).push(l.slice(i + 1).trim());
  });
  const linha = linhas[0]; const resp = linha.startsWith('SIP/2.0');
  const h = (n) => (cab[n] || [])[0];
  return {
    linha, cab, corpo, h, todos: (n) => cab[n] || [], ehResposta: resp,
    status: resp ? Number(linha.split(' ')[1]) : 0,
    metodo: resp ? String(h('cseq') || '').split(' ').slice(1).join(' ').trim() : linha.split(' ')[0],
  };
}

class Rtp {
  constructor() {
    this.sock = dgram.createSocket('udp4'); this.entrada = new Fila(); this.saida = []; this.rodando = false;
    this.pronto = new Promise((r) => this.sock.bind(0, () => r()));
  }
  get porta() { return this.sock.address().port; }
  iniciar(ip, porta) {
    this.rodando = true;
    this.sock.on('message', (buf) => {
      if (buf.length <= 12 || (buf[1] & 0x7f) !== 0) return;
      const ini = 12 + (buf[0] & 0x0f) * 4;
      const q = new Int16Array(buf.length - ini); for (let i = 0; i < q.length; i++) q[i] = ulawParaPcm(buf[ini + i]);
      this.entrada.push(q); while (this.entrada.size > 500) this.entrada.itens.shift();
    });
    let seq = Math.floor(Math.random() * 65535); let ts = Math.floor(Math.random() * 2 ** 31) >>> 0;
    const ssrc = crypto.randomBytes(4);
    let proximo = Date.now();
    const passo = () => {
      if (!this.rodando) return;
      const q = this.saida.shift(); this.falando = !!q || this.saida.length > 0;
      const pkt = Buffer.alloc(172);
      pkt[0] = 0x80; pkt[1] = 0; pkt.writeUInt16BE(seq, 2); pkt.writeUInt32BE(ts >>> 0, 4); ssrc.copy(pkt, 8);
      for (let i = 0; i < 160; i++) pkt[12 + i] = pcmParaUlaw(q && i < q.length ? q[i] : 0);
      try { this.sock.send(pkt, porta, ip); } catch {}
      seq = (seq + 1) & 0xffff; ts = (ts + 160) >>> 0;
      proximo += 20; setTimeout(passo, Math.max(0, proximo - Date.now()));
    };
    passo();
  }
  tocar(pcm) { for (let i = 0; i < pcm.length; i += 160) this.saida.push(pcm.slice(i, i + 160)); }
  tocando() { return this.falando || this.saida.length > 0; }
  parar() { this.rodando = false; try { this.sock.close(); } catch {} }
}

class Chamada {
  constructor(sip, callId, entrada, numero) {
    Object.assign(this, { sip, callId, entrada, numero });
    this.ativa = false; this.encerrada = false; this.tagLocal = tag(); this.tagRemota = '';
    this.deCab = ''; this.paraCab = ''; this.alvoRemoto = ''; this.cseq = 1; this.convite = null;
    this.rtp = new Rtp(); this.respostas = new Fila();
  }
  desligar() {
    if (this.encerrada) return;
    if (this.ativa) this.sip.noDialogo(this, 'BYE'); else if (!this.entrada) this.sip.noDialogo(this, 'CANCEL');
    this.encerrar();
  }
  transferir(ramal) {
    if (!this.ativa) return;
    const h = this.sip.host;
    this.sip.noDialogo(this, 'REFER', [`Refer-To: <sip:${ramal}@${h}>`, `Referred-By: <sip:${this.sip.ramal}@${h}>`]);
  }
  encerrar() {
    if (this.encerrada) return;
    this.encerrada = true; this.ativa = false; this.rtp.parar(); this.sip.chamadas.delete(this.callId);
  }
}

class Sip {
  constructor({ host, porta, ramal, senha, log, aoReceber }) {
    Object.assign(this, { host, porta, ramal, senha, log, aoReceber });
    this.sock = dgram.createSocket('udp4'); this.chamadas = new Map(); this.regResp = new Fila();
    this.regCallId = uid(); this.regTag = tag(); this.regCseq = 1; this.registrado = false;
    this.sock.on('message', (b) => this.receber(b.toString()));
    this.sock.on('error', (e) => this.log('Erro de rede: ' + e.message));
  }
  async abrir() {
    await new Promise((r) => this.sock.bind(0, () => r()));
    this.portaLocal = this.sock.address().port;
    this.ipLocal = await new Promise((r) => {
      const s = dgram.createSocket('udp4');
      s.connect(this.porta, this.host, () => { const ip = s.address().address; s.close(); r(ip); });
      s.on('error', () => r('0.0.0.0'));
    });
  }
  via() { return `Via: SIP/2.0/UDP ${this.ipLocal}:${this.portaLocal};branch=z9hG4bK${uid().slice(0, 12)};rport`; }
  contato() { return `Contact: <sip:${this.ramal}@${this.ipLocal}:${this.portaLocal};transport=udp>`; }
  enviar(txt) { this.sock.send(Buffer.from(txt), this.porta, this.host); }
  montar(metodo, uri, cab, corpo = '') {
    let s = `${metodo} ${uri} SIP/2.0\r\n` + cab.filter(Boolean).map((c) => c + '\r\n').join('') + 'Max-Forwards: 70\r\nUser-Agent: Pilar Voz\r\n';
    if (corpo) s += 'Content-Type: application/sdp\r\n';
    return s + `Content-Length: ${Buffer.byteLength(corpo)}\r\n\r\n` + corpo;
  }
  autenticar(d, metodo, uri) {
    const proxy = d.status === 407;
    const linha = (proxy ? d.h('proxy-authenticate') : d.h('www-authenticate')) || '';
    const p = (n) => (linha.match(new RegExp(`${n}="?([^",]+)"?`)) || [])[1] || '';
    const realm = p('realm'); const nonce = p('nonce'); const qop = p('qop'); const opaque = p('opaque');
    const ha1 = md5(`${this.ramal}:${realm}:${this.senha}`); const ha2 = md5(`${metodo}:${uri}`);
    const cn = uid().slice(0, 8); const nc = '00000001';
    const r = qop ? md5(`${ha1}:${nonce}:${nc}:${cn}:auth:${ha2}`) : md5(`${ha1}:${nonce}:${ha2}`);
    const extra = (qop ? `,qop=auth,nc=${nc},cnonce="${cn}"` : '') + (opaque ? `,opaque="${opaque}"` : '');
    return `${proxy ? 'Proxy-Authorization' : 'Authorization'}: Digest username="${this.ramal}",realm="${realm}",nonce="${nonce}",uri="${uri}",response="${r}",algorithm=MD5${extra}`;
  }
  async registrar(expira = 300) {
    const uri = `sip:${this.host}`;
    const req = (auth) => this.montar('REGISTER', uri, [this.via(), `From: <sip:${this.ramal}@${this.host}>;tag=${this.regTag}`,
      `To: <sip:${this.ramal}@${this.host}>`, `Call-ID: ${this.regCallId}`, `CSeq: ${this.regCseq++} REGISTER`, this.contato(), `Expires: ${expira}`, auth]);
    this.regResp.clear(); this.enviar(req(null));
    let r = await this.regResp.pop(5000);
    if (!r) { this.registrado = false; this.log('Central não respondeu'); return false; }
    if (r.status === 401 || r.status === 407) { this.enviar(req(this.autenticar(r, 'REGISTER', uri))); r = await this.regResp.pop(5000); }
    this.registrado = !!r && r.status >= 200 && r.status < 300;
    if (!this.registrado) this.log(`Registro recusado (${r ? r.status : 'sem resposta'}). Confira ramal e senha.`);
    return this.registrado;
  }
  sdp(p) {
    const ip = this.ipLocal;
    return `v=0\r\no=pilar 1 1 IN IP4 ${ip}\r\ns=Pilar Voz\r\nc=IN IP4 ${ip}\r\nt=0 0\r\nm=audio ${p} RTP/AVP 0 101\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:101 telephone-event/8000\r\na=ptime:20\r\na=sendrecv\r\n`;
  }
  destinoRtp(corpo) {
    const ip = (corpo.match(/c=IN IP4 ([0-9.]+)/) || [])[1]; const p = (corpo.match(/m=audio (\d+)/) || [])[1];
    return ip && p ? { ip, porta: Number(p) } : null;
  }
  ack(c, r) {
    const uri = r.status >= 200 && r.status < 300 ? c.alvoRemoto : `sip:${c.numero}@${this.host}`;
    this.enviar(this.montar('ACK', uri, [this.via(), `From: ${c.deCab}`, `To: ${r.h('to')}`, `Call-ID: ${c.callId}`, `CSeq: ${c.cseq} ACK`]));
  }
  async ligar(numero, limiteSeg = 45) {
    const c = new Chamada(this, uid(), false, numero); await c.rtp.pronto;
    const uri = `sip:${numero}@${this.host}`;
    c.alvoRemoto = uri; c.deCab = `<sip:${this.ramal}@${this.host}>;tag=${c.tagLocal}`; c.paraCab = `<${uri}>`;
    this.chamadas.set(c.callId, c);
    const corpo = this.sdp(c.rtp.porta);
    const convite = (auth) => this.montar('INVITE', uri, [this.via(), `From: ${c.deCab}`, `To: ${c.paraCab}`, `Call-ID: ${c.callId}`, `CSeq: ${c.cseq} INVITE`, this.contato(), auth], corpo);
    this.enviar(convite(null));
    const limite = Date.now() + limiteSeg * 1000;
    while (Date.now() < limite) {
      const r = await c.respostas.pop(1000); if (!r || r.metodo !== 'INVITE') continue;
      if (r.status === 401 || r.status === 407) { this.ack(c, r); c.cseq++; this.enviar(convite(this.autenticar(r, 'INVITE', uri))); }
      else if (r.status < 200) continue;
      else if (r.status < 300) {
        c.tagRemota = ((r.h('to') || '').match(/tag=([^;>\s]+)/) || [])[1] || '';
        c.paraCab = r.h('to') || c.paraCab;
        const ct = ((r.h('contact') || '').match(/<([^>]+)>/) || [])[1]; if (ct) c.alvoRemoto = ct;
        this.ack(c, r);
        const d = this.destinoRtp(r.corpo); if (!d) { c.desligar(); return null; }
        c.rtp.iniciar(d.ip, d.porta); c.ativa = true; return c;
      } else { this.ack(c, r); this.log(`Ligação para ${numero} recusada (${r.status})`); c.encerrar(); return null; }
    }
    c.desligar(); return null;
  }
  noDialogo(c, metodo, extra = []) {
    if (metodo !== 'CANCEL') c.cseq++;
    this.enviar(this.montar(metodo, c.alvoRemoto, [this.via(), `From: ${c.deCab}`, `To: ${c.paraCab}`, `Call-ID: ${c.callId}`, `CSeq: ${c.cseq} ${metodo}`, this.contato(), ...extra]));
  }
  responder(req, cod, frase, tg = null, corpo = '') {
    let s = `SIP/2.0 ${cod} ${frase}\r\n` + req.todos('via').map((v) => `Via: ${v}\r\n`).join('');
    const para = req.h('to') || '';
    s += `From: ${req.h('from')}\r\nTo: ${tg && !para.includes('tag=') ? `${para};tag=${tg}` : para}\r\nCall-ID: ${req.h('call-id')}\r\nCSeq: ${req.h('cseq')}\r\n${this.contato()}\r\nUser-Agent: Pilar Voz\r\n`;
    if (corpo) s += 'Content-Type: application/sdp\r\n';
    this.enviar(s + `Content-Length: ${Buffer.byteLength(corpo)}\r\n\r\n` + corpo);
  }
  async atender(c) {
    const inv = c.convite; if (!inv) return;
    await c.rtp.pronto;
    const d = this.destinoRtp(inv.corpo); if (!d) return this.responder(inv, 488, 'Not Acceptable Here', c.tagLocal);
    this.responder(inv, 200, 'OK', c.tagLocal, this.sdp(c.rtp.porta));
    c.rtp.iniciar(d.ip, d.porta); c.ativa = true;
  }
  recusar(c) { if (c.convite) this.responder(c.convite, 486, 'Busy Here', c.tagLocal); c.encerrar(); }
  receber(txt) {
    const m = lerSip(txt); if (!m) return;
    const callId = m.h('call-id'); if (!callId) return;
    if (m.ehResposta) { if (callId === this.regCallId) this.regResp.push(m); else this.chamadas.get(callId)?.respostas.push(m); return; }
    const c = this.chamadas.get(callId);
    switch (m.metodo) {
      case 'INVITE': {
        if (c) return;
        this.responder(m, 100, 'Trying');
        const de = m.h('from') || ''; const numero = (de.match(/sip:([^@;>]+)/) || [])[1] || '';
        const n = new Chamada(this, callId, true, numero);
        n.convite = m; n.tagRemota = (de.match(/tag=([^;>\s]+)/) || [])[1] || '';
        n.deCab = `${m.h('to')};tag=${n.tagLocal}`; n.paraCab = de;
        n.alvoRemoto = ((m.h('contact') || '').match(/<([^>]+)>/) || [])[1] || `sip:${numero}@${this.host}`;
        this.chamadas.set(callId, n);
        this.responder(m, 180, 'Ringing', n.tagLocal);
        this.aoReceber(n);
        break;
      }
      case 'BYE': this.responder(m, 200, 'OK'); c?.encerrar(); break;
      case 'CANCEL': this.responder(m, 200, 'OK'); if (c) { if (c.convite) this.responder(c.convite, 487, 'Request Terminated', c.tagLocal); c.encerrar(); } break;
      case 'ACK': break;
      case 'NOTIFY': this.responder(m, 200, 'OK'); if (m.corpo.includes('SIP/2.0 200')) c?.desligar(); break;
      default: this.responder(m, 200, 'OK');
    }
  }
  async parar() {
    [...this.chamadas.values()].forEach((c) => c.desligar());
    try { await this.registrar(0); } catch {}
    try { this.sock.close(); } catch {}
  }
}

// ─── Serviço ─────────────────────────────────────────────────────────────
const MON = {
  servico: 'Parado', central: '—', modo: null, destino: null, inicio: 0, falaCliente: '', falaIa: '',
  atendidas: 0, feitas: 0, assistidas: 0, transferidas: 0, eventos: [],
};
let rodando = false; let sip = null;
function log(t) {
  console.log('[voz]', t);
  MON.eventos.unshift({ em: new Date().toISOString(), texto: t }); MON.eventos.length = Math.min(MON.eventos.length, 40);
}

async function principal() {
  while (rodando) {
    try {
      const v = loadConfig().voz || {};
      const agente = (await api('config')).agente || {};
      const ramal = String(v.ramal || agente.ramal_ia || '').trim();
      if (!v.host || !ramal) { MON.central = 'Preencha o endereço da central e o ramal'; log(MON.central); rodando = false; MON.servico = 'Parado'; return; }
      sip = new Sip({ host: v.host, porta: Number(v.porta) || 5060, ramal, senha: v.senha || '', log, aoReceber: (c) => aoReceber(c) });
      await sip.abrir();
      if (!(await sip.registrar())) { MON.central = 'Falha no registro'; await sip.parar(); sip = null; await dormir(15_000); continue; }
      MON.servico = 'Ativo'; MON.central = `Ramal ${ramal} registrado em ${v.host}`; log(MON.central);
      let ultimo = Date.now();
      while (rodando) {
        if (Date.now() - ultimo > 240_000) { if (!(await sip.registrar())) { MON.central = 'Registro perdido'; break; } ultimo = Date.now(); }
        const cmd = (await silencioso(api('comandos')))?.comando;
        if (cmd) executarComando(cmd);
        await dormir(3000);
      }
      await sip.parar(); sip = null;
    } catch (e) {
      MON.central = 'Erro: ' + e.message; log('Erro: ' + e.message); await dormir(15_000);
    }
  }
}

async function aoReceber(c) {
  const cfg = (await silencioso(api('config')))?.agente;
  const modos = cfg?.modos || [];
  if (!cfg || !modos.includes('receber') || sip.chamadas.size > 1) { sip.recusar(c); return; }
  log(`Atendendo ${c.numero}`);
  await sip.atender(c);
  conduzir(c, cfg, 'receber', null, c.numero, null);
}

async function executarComando(cmd) {
  const tipo = cmd.tipo;
  const escuta = (loadConfig().voz || {}).codigoEscuta || '*45';
  const destino = tipo === 'ligar' ? cmd.numero : `${escuta}${cmd.ramal}`;
  log(tipo === 'ligar' ? `Ligando para ${destino}` : `Escutando o ramal ${cmd.ramal}`);
  const c = await sip.ligar(destino);
  if (!c) { silencioso(api('comando_status', { comando_id: cmd.id, status: 'sem_resposta' })); return; }
  silencioso(api('comando_status', { comando_id: cmd.id, status: 'concluido' }));
  const cfg = (await silencioso(api('config', { agente_id: cmd.agente_id || null })))?.agente || {};
  conduzir(c, cfg, tipo === 'ligar' ? 'ligar' : 'assistir', cmd.objetivo || null, cmd.numero || null, cmd.ramal || null);
}

async function turno(wav, hist, modo, objetivo, extra, chamadaId, numero, agenteId = null) {
  return api('turno', { audio_wav_b64: wav, historico: hist, modo, objetivo, prompt_extra: extra, chamada_id: chamadaId, numero, agente_id: agenteId });
}

async function conduzir(c, cfg, modo, objetivo, numero, ramal) {
  const chamadaId = (await silencioso(api('iniciar', { modo, numero, ramal, agente_id: cfg.id || null })))?.id || null;
  const hist = [];
  Object.assign(MON, { modo, destino: numero || ramal || '?', inicio: Date.now(), falaCliente: '', falaIa: '' });
  if (modo === 'receber') MON.atendidas++; else if (modo === 'ligar') MON.feitas++; else MON.assistidas++;
  const registrar = (papel, texto) => {
    if (!texto) return;
    if (papel === 'cliente') MON.falaCliente = texto; else MON.falaIa = texto;
    hist.push({ papel, texto });
    if (chamadaId) silencioso(api('fala', { chamada_id: chamadaId, papel, texto }));
  };
  let erro = false;
  try {
    if (modo !== 'assistir' && cfg.saudacao) {
      const r = await silencioso(turno(null, [{ papel: 'cliente', texto: '.' }], 'receber', null, `Diga exatamente, sem mudar nada: ${cfg.saudacao}`, null, null, cfg.id || null));
      if (r?.audio_b64) c.rtp.tocar(wavPara8k(r.audio_b64));
      registrar('agente', cfg.saudacao);
    }
    let trecho = []; let silencio = 0; let falando = false;
    while (c.ativa) {
      const q = await c.rtp.entrada.pop(300); if (!q) continue;
      if (modo !== 'assistir' && c.rtp.tocando()) { trecho = []; falando = false; continue; }
      if (energia(q) > LIMIAR_FALA) { falando = true; silencio = 0; trecho.push(...q); continue; }
      if (!falando) continue;
      trecho.push(...q);
      if (++silencio <= 35) continue;
      if (trecho.length > 4000) {
        const r = await turno(wav8k(trecho).toString('base64'), hist, modo, objetivo, null, chamadaId, numero).catch((e) => { log('IA: ' + e.message); return null; });
        if (r) {
          registrar('cliente', r.fala);
          const resp = String(r.resposta || '').trim();
          if (modo === 'assistir') { if (resp) { MON.falaIa = 'Sugestão: ' + resp; if (chamadaId) silencioso(api('sugestao', { chamada_id: chamadaId, texto: resp })); } }
          else if (resp) {
            registrar('agente', resp.replace('[TRANSFERIR]', '').replace('[DESLIGAR]', '').trim());
            if (r.audio_b64) c.rtp.tocar(wavPara8k(r.audio_b64));
            while (c.ativa && c.rtp.tocando()) await dormir(100);
            const transf = modo === 'ligar' && ramal ? ramal : cfg.ramal_transferencia;
            if (resp.includes('[TRANSFERIR]') && transf) { MON.transferidas++; log(`Transferindo para o ramal ${transf}`); c.transferir(transf); await dormir(4000); break; }
            if (resp.includes('[DESLIGAR]')) break;
          }
        }
      }
      trecho = []; silencio = 0; falando = false;
    }
  } catch (e) { erro = true; log('Erro na ligação: ' + e.message); }
  finally {
    c.desligar();
    if (chamadaId) silencioso(api('finalizar', { chamada_id: chamadaId, status: erro ? 'erro' : 'finalizada' }));
    Object.assign(MON, { modo: null, destino: null, inicio: 0 });
    log('Ligação encerrada');
  }
}

function startVoz() {
  saveConfig({ vozEnabled: true });
  if (rodando) return;
  rodando = true; MON.servico = 'Conectando';
  principal().finally(() => { if (!rodando) MON.servico = 'Parado'; });
}
function stopVoz() {
  saveConfig({ vozEnabled: false });
  rodando = false; MON.servico = 'Parado'; MON.central = '—';
  if (sip) { sip.parar(); sip = null; }
}
// Ao sair do app: para sem mudar a escolha salva (volta ligado no próximo início).
function pararVozSemSalvar() { rodando = false; if (sip) { sip.parar(); sip = null; } }
function statusVoz() { return { ...MON, rodando, config: { ...(loadConfig().voz || {}), senha: undefined } }; }
function salvarConfigVoz(v) {
  const atual = loadConfig().voz || {};
  const novo = { ...atual, ...v }; if (!v.senha) novo.senha = atual.senha;
  saveConfig({ voz: novo });
  if (rodando) { pararVozSemSalvar(); setTimeout(startVoz, 500); }
  return statusVoz();
}

module.exports = { startVoz, stopVoz, statusVoz, salvarConfigVoz, pararVozSemSalvar };
