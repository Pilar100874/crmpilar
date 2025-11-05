import { SQLEditor } from "./SQLEditor";

interface DataSourcePanelProps {
  connectionId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
}

export function DataSourcePanel({ connectionId, query, onQueryChange }: DataSourcePanelProps) {
  return (
    <div className="h-full">
      <SQLEditor
        connectionId={connectionId}
        query={query}
        onQueryChange={onQueryChange}
      />
    </div>
  );
}
