import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { Card } from "@/components/ui/card";

interface DataTableProps {
  data: any[];
  width: number;
  height: number;
}

export function DataTable({ data, width, height }: DataTableProps) {
  const columnDefs = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return Object.keys(data[0]).map((key) => ({
      field: key,
      headerName: key.charAt(0).toUpperCase() + key.slice(1),
      sortable: true,
      filter: true,
      resizable: true,
    }));
  }, [data]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
  }), []);

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center border rounded bg-muted/10"
        style={{ width, height }}
      >
        <span className="text-sm text-muted-foreground">Sem dados</span>
      </div>
    );
  }

  return (
    <div 
      className="ag-theme-alpine"
      style={{ width, height }}
    >
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={10}
        enableCellTextSelection={true}
        ensureDomOrder={true}
      />
    </div>
  );
}
