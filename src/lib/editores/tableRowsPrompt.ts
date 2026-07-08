// Popup simples (DOM) para perguntar o intervalo de linhas ao inserir tabela.
export function promptTableRows(alias: string): Promise<{ from: number; to: number } | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;";
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:8px;padding:24px;min-width:380px;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
        <h3 style="margin:0 0 4px;font-size:16px;font-weight:600;color:#111;">Inserir tabela "${alias}"</h3>
        <p style="margin:0 0 16px;color:#666;font-size:13px;">Selecione quantas linhas exibir.</p>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:18px;">
          <label style="font-size:13px;color:#333;">De</label>
          <input id="__tr_from" type="number" min="1" value="1" style="width:90px;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:14px;" />
          <label style="font-size:13px;color:#333;">até</label>
          <input id="__tr_to" type="number" min="0" value="0" placeholder="todas" style="width:90px;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:14px;" />
          <span style="color:#888;font-size:12px;">0 = todas</span>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="__tr_cancel" type="button" style="padding:6px 14px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;font-size:13px;">Cancelar</button>
          <button id="__tr_ok" type="button" style="padding:6px 14px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">Inserir</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const cleanup = (v: { from: number; to: number } | null) => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(v);
    };
    const confirm = () => {
      const fromEl = overlay.querySelector("#__tr_from") as HTMLInputElement;
      const toEl = overlay.querySelector("#__tr_to") as HTMLInputElement;
      let from = Math.max(1, Math.floor(Number(fromEl.value) || 1));
      let to = Math.max(0, Math.floor(Number(toEl.value) || 0));
      if (to !== 0 && to < from) to = from;
      cleanup({ from, to });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup(null);
      else if (e.key === "Enter") confirm();
    };
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) cleanup(null);
    });
    overlay.querySelector("#__tr_cancel")!.addEventListener("click", () => cleanup(null));
    overlay.querySelector("#__tr_ok")!.addEventListener("click", confirm);
    setTimeout(() => (overlay.querySelector("#__tr_from") as HTMLInputElement)?.focus(), 0);
  });
}
