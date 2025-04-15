
import React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowDown, ArrowUp } from "lucide-react";

interface SortableColumnProps {
  column: string;
  currentSort: string;
  direction: string;
  onSort: (column: string) => void;
  children: React.ReactNode;
}

const SortableColumn: React.FC<SortableColumnProps> = ({ 
  column, 
  currentSort, 
  direction, 
  onSort, 
  children 
}) => {
  return (
    <TableHead role="button" onClick={() => onSort(column)} className="whitespace-nowrap">
      {children}
      {currentSort === column && (
        direction === "asc" 
          ? <ArrowUp className="h-4 w-4 inline ml-1" /> 
          : <ArrowDown className="h-4 w-4 inline ml-1" />
      )}
    </TableHead>
  );
};

export default SortableColumn;
