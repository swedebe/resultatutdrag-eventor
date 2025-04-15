import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { ResultRow } from "@/services/FileProcessingService";

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

interface ResultsTableProps {
  results: ResultRow[];
}

const ResultsTable = ({ results }: ResultsTableProps) => {
  const [sortColumn, setSortColumn] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  const filteredResults = results.filter(result => {
    if (!searchTerm) return true;
    const searchTermLower = searchTerm.toLowerCase();
    return (
      (typeof result.name === 'string' && result.name.toLowerCase().includes(searchTermLower)) ||
      (typeof result.class === 'string' && result.class.toLowerCase().includes(searchTermLower)) ||
      (typeof result.eventName === 'string' && result.eventName.toLowerCase().includes(searchTermLower)) ||
      (typeof result.organizer === 'string' && result.organizer.toLowerCase().includes(searchTermLower))
    );
  });
  
  const sortedResults = [...filteredResults].sort((a, b) => {
    let valueA, valueB;

    switch (sortColumn) {
      case "name":
      case "class":
      case "eventName":
      case "organizer":
      case "eventType":
        valueA = typeof a[sortColumn] === 'string' ? (a[sortColumn] as string).toLowerCase() : '';
        valueB = typeof b[sortColumn] === 'string' ? (b[sortColumn] as string).toLowerCase() : '';
        break;
      case "personId":
      case "birthYear":
        valueA = a[sortColumn] || '';
        valueB = b[sortColumn] || '';
        break;
      case "started":
        valueA = a[sortColumn]?.toString() || '';
        valueB = b[sortColumn]?.toString() || '';
        break;
      case "time":
        valueA = a.timeInSeconds || Number.MAX_VALUE;
        valueB = b.timeInSeconds || Number.MAX_VALUE;
        break;
      case "position":
      case "totalParticipants":
      case "length":
        valueA = a[sortColumn] || 0;
        valueB = b[sortColumn] || 0;
        break;
      case "date":
        valueA = new Date(a.date).getTime();
        valueB = new Date(b.date).getTime();
        break;
      default:
        valueA = a[sortColumn] || "";
        valueB = b[sortColumn] || "";
    }

    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const displayValue = (value: any, suffix: string = ''): string => {
    if (value === null || value === undefined || value === '' || value === 0) {
      return "-";
    }
    return `${value}${suffix}`;
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Sök på namn, klass eller tävling..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={() => setSearchTerm("")}>
          Rensa
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption>
            Totalt {filteredResults.length} resultat för klubben
          </TableCaption>
          <TableHeader>
            <TableRow>
              <SortableColumn column="date" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Datum
              </SortableColumn>
              <SortableColumn column="eventName" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Tävling
              </SortableColumn>
              <SortableColumn column="eventType" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Typ
              </SortableColumn>
              <SortableColumn column="name" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Namn
              </SortableColumn>
              <SortableColumn column="class" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Klass
              </SortableColumn>
              <SortableColumn column="length" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Längd
              </SortableColumn>
              <SortableColumn column="time" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Tid
              </SortableColumn>
              <SortableColumn column="position" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Plac
              </SortableColumn>
              <SortableColumn column="totalParticipants" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Antal
              </SortableColumn>
              <SortableColumn column="organizer" currentSort={sortColumn} direction={sortDirection} onSort={handleSort}>
                Arrangör
              </SortableColumn>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4">
                  Inga resultat hittades
                </TableCell>
              </TableRow>
            ) : (
              sortedResults.map((result, index) => (
                <TableRow key={`${result.eventName}-${result.name}-${index}`}>
                  <TableCell>{displayValue(result.date)}</TableCell>
                  <TableCell>{displayValue(result.eventName)}</TableCell>
                  <TableCell>{displayValue(result.eventType)}</TableCell>
                  <TableCell>{displayValue(result.name)}</TableCell>
                  <TableCell>{displayValue(result.class)}</TableCell>
                  <TableCell>{result.length ? `${result.length} m` : "-"}</TableCell>
                  <TableCell>{displayValue(result.time)}</TableCell>
                  <TableCell>{displayValue(result.position)}</TableCell>
                  <TableCell>{displayValue(result.totalParticipants)}</TableCell>
                  <TableCell>{displayValue(result.organizer)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ResultsTable;
