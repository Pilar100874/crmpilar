// Store em memória para datasets importados (Excel/CSV) usados como fonte
// de dados no MergeBuilder. Persistência é feita via `modelo.merge_config.importedDatasets`
// — o editor hidrata este store na carga do modelo.

export interface ImportedDataset {
  id: string;            // ex: "xlsx:contatos_2024"
  name: string;          // rótulo humano ("Contatos 2024")
  columns: string[];     // ordem dos campos exibidos
  rows: Record<string, any>[];
}

type Listener = () => void;
const store = new Map<string, ImportedDataset>();
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((l) => l());

export function registerDataset(ds: ImportedDataset) {
  store.set(ds.id, ds);
  notify();
}

export function removeDataset(id: string) {
  store.delete(id);
  notify();
}

export function getDataset(id: string): ImportedDataset | undefined {
  return store.get(id);
}

export function getAllDatasets(): ImportedDataset[] {
  return Array.from(store.values());
}

export function hydrateDatasets(list: ImportedDataset[] | null | undefined) {
  store.clear();
  (list ?? []).forEach((d) => store.set(d.id, d));
  notify();
}

export function subscribeDatasets(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function newDatasetId(hint: string): string {
  const base = (hint || "planilha")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "planilha";
  let id = `xlsx:${base}`;
  let i = 2;
  while (store.has(id)) { id = `xlsx:${base}_${i++}`; }
  return id;
}
