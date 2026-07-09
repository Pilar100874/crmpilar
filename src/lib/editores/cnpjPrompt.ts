// Modal simples (DOM puro) para pedir CNPJ com máscara + botão Cancelar.
// Retorna o CNPJ **mascarado** (ex: "12.345.678/0001-90") ou null se cancelado.

const maskCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

export function maskCnpjValue(v: string): string {
  return maskCnpj(v);
}

export function askCnpjModal(titulo = "Informe o CNPJ"): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#fff;border-radius:8px;padding:20px;min-width:340px;max-width:92vw;box-shadow:0 10px 30px rgba(0,0,0,.2);font-family:inherit;color:#111;";

    const h = document.createElement("div");
    h.textContent = titulo;
    h.style.cssText = "font-weight:600;font-size:16px;margin-bottom:8px;";

    const p = document.createElement("div");
    p.textContent = "Buscaremos os dados da Receita para preencher os campos automaticamente.";
    p.style.cssText = "font-size:12px;color:#555;margin-bottom:12px;";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "00.000.000/0000-00";
    input.inputMode = "numeric";
    input.style.cssText =
      "width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;";
    input.addEventListener("input", () => {
      input.value = maskCnpj(input.value);
    });

    const err = document.createElement("div");
    err.style.cssText = "color:#b91c1c;font-size:12px;margin-top:6px;min-height:16px;";

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:14px;";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    cancel.style.cssText =
      "padding:8px 14px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;";

    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "Confirmar";
    ok.style.cssText =
      "padding:8px 14px;border-radius:6px;border:0;background:#2563eb;color:#fff;cursor:pointer;";

    const cleanup = () => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
    };
    const doCancel = () => { cleanup(); resolve(null); };
    const doOk = () => {
      const clean = input.value.replace(/\D/g, "");
      if (clean.length !== 14) { err.textContent = "CNPJ inválido. Informe 14 dígitos."; return; }
      cleanup();
      resolve(maskCnpj(input.value));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") doCancel();
      if (e.key === "Enter") doOk();
    };

    cancel.addEventListener("click", doCancel);
    ok.addEventListener("click", doOk);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) doCancel(); });
    document.addEventListener("keydown", onKey);

    actions.appendChild(cancel);
    actions.appendChild(ok);
    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(input);
    box.appendChild(err);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 0);
  });
}
