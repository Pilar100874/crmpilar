const grid = document.getElementById('grid');
const dlg = document.getElementById('configDlg');
const camerasEl = document.getElementById('cameras');
let cfg = { token:'', cameras:[], gridSize:4, retentionDays:7, motionEnabled:false };

function render() {
  document.getElementById('statusBar').textContent =
    cfg.token ? `Conectado · ${cfg.cameras.length} câmera(s)` : 'Sem token';
  grid.className = 'grid-' + Math.ceil(Math.sqrt(cfg.gridSize));
  grid.innerHTML = '';
  for (let i = 0; i < cfg.gridSize; i++) {
    const cam = cfg.cameras[i];
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.innerHTML = cam
      ? `<div class="label">${cam.nome || 'Câmera ' + (i+1)}</div>
         <img class="preview" id="prev-${cam.id}" alt="aguardando..." />
         <button data-id="${cam.id}" class="snap">📸 Snapshot</button>`
      : `<div class="empty">Vazio</div>`;
    grid.appendChild(cell);
  }
  grid.querySelectorAll('.snap').forEach(b =>
    b.onclick = () => window.pilar.snapshot(b.dataset.id));
}

function renderCamForm() {
  camerasEl.innerHTML = '';
  cfg.cameras.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'cam-row';
    div.innerHTML = `
      <input placeholder="Nome" value="${c.nome||''}" data-k="nome" />
      <input placeholder="rtsp://user:pass@ip:554/..." value="${c.rtsp||''}" data-k="rtsp" />
      <button type="button" data-rm="${i}">✕</button>`;
    div.querySelectorAll('input').forEach(inp =>
      inp.oninput = e => c[e.target.dataset.k] = e.target.value);
    div.querySelector('[data-rm]').onclick = () => { cfg.cameras.splice(i,1); renderCamForm(); };
    camerasEl.appendChild(div);
  });
}

document.getElementById('btnConfig').onclick = () => {
  document.getElementById('cfgToken').value = cfg.token;
  document.getElementById('cfgGrid').value = cfg.gridSize;
  document.getElementById('cfgRet').value = cfg.retentionDays;
  document.getElementById('cfgMotion').checked = cfg.motionEnabled;
  renderCamForm();
  dlg.showModal();
};
document.getElementById('btnAddCam').onclick = () => {
  cfg.cameras.push({ id: crypto.randomUUID(), nome:'', rtsp:'' });
  renderCamForm();
};
document.getElementById('btnSave').onclick = async () => {
  cfg.token = document.getElementById('cfgToken').value.trim();
  cfg.gridSize = parseInt(document.getElementById('cfgGrid').value);
  cfg.retentionDays = parseInt(document.getElementById('cfgRet').value);
  cfg.motionEnabled = document.getElementById('cfgMotion').checked;
  cfg = await window.pilar.saveConfig(cfg);
  render();
};

(async () => {
  cfg = await window.pilar.getConfig();
  render();
  window.pilar.onConfigUpdated(next => { cfg = next; render(); });
  window.pilar.onPreviewFrame(({ id, dataUrl }) => {
    const img = document.getElementById('prev-' + id);
    if (img) img.src = dataUrl;
  });
})();
