import { SQLEditor } from "./SQLEditor";

interface DataSourcePanelProps {
  connectionId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  dataSourceId: string; // id lógico da fonte (ex: "main" ou ds-123)
}

export function DataSourcePanel({ connectionId, query, onQueryChange, dataSourceId }: DataSourcePanelProps) {
  return (
    <div className="h-full">
      <SQLEditor
        connectionId={connectionId}
        query={query}
        onQueryChange={onQueryChange}
        dataSourceId={dataSourceId}
      />
    </div>
  );
}
