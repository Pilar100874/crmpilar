// Store singleton que mantém valores atuais dos campos [[fillable]] preenchidos
// via QuickFillDialog. As NodeViews de FillableField assinam este store para
// atualizar o valor exibido no input quando o usuário aplica valores no popup.
type Listener = () => void;

let values: Record<string, string> = {};
const listeners = new Set<Listener>();

export function setFillableValues(v: Record<string, string>) {
  values = { ...v };
  listeners.forEach((l) => l());
}

export function mergeFillableValues(partial: Record<string, string>) {
  values = { ...values, ...partial };
  listeners.forEach((l) => l());
}

export function getFillableValues(): Record<string, string> {
  return values;
}

export function getFillableValue(rawToken: string, label?: string): string {
  const stripped = rawToken.replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
  if (rawToken in values) return values[rawToken] ?? "";
  if (stripped in values) return values[stripped] ?? "";
  if (label && label in values) return values[label] ?? "";
  return "";
}

export function subscribeFillable(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
