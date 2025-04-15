
import React from "react";
import { TableHeader, TableRow } from "@/components/ui/table";
import SortableColumn from "./SortableColumn";

interface ResultsTableHeaderProps {
  sortColumn: string;
  sortDirection: string;
  onSort: (column: string) => void;
}

const ResultsTableHeader: React.FC<ResultsTableHeaderProps> = ({ 
  sortColumn, 
  sortDirection, 
  onSort 
}) => {
  return (
    <TableHeader>
      <TableRow>
        <SortableColumn column="date" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Datum
        </SortableColumn>
        <SortableColumn column="eventName" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Tävling
        </SortableColumn>
        <SortableColumn column="eventType" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Typ
        </SortableColumn>
        <SortableColumn column="name" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Namn
        </SortableColumn>
        <SortableColumn column="class" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Klass
        </SortableColumn>
        <SortableColumn column="length" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Längd
        </SortableColumn>
        <SortableColumn column="time" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Tid
        </SortableColumn>
        <SortableColumn column="position" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Plac
        </SortableColumn>
        <SortableColumn column="totalParticipants" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Antal
        </SortableColumn>
        <SortableColumn column="organizer" currentSort={sortColumn} direction={sortDirection} onSort={onSort}>
          Arrangör
        </SortableColumn>
      </TableRow>
    </TableHeader>
  );
};

export default ResultsTableHeader;
