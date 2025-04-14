
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

interface ResultsTableProps {
  results: any[];
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
      result.name?.toLowerCase().includes(searchTermLower) ||
      result.class?.toLowerCase().includes(searchTermLower) ||
      result.eventName?.toLowerCase().includes(searchTermLower) ||
      result.organizer?.toLowerCase().includes(searchTermLower)
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
      case "personId":
      case "birthYear":
      case "started":
        valueA = a[sortColumn]?.toLowerCase() || "";
        valueB = b[sortColumn]?.toLowerCase() || "";
        break;
      case "time":
        valueA = a.timeInSeconds || Number.MAX_VALUE;
        valueB = b.timeInSeconds || Number.MAX_VALUE;
        break;
      case "timeAfterWinner":
        valueA = a.timeAfterWinner || "";
        valueB = b.timeAfterWinner || "";
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

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />;
  };

  // Helper function to display dash for empty or zero values
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
              <TableHead role="button" onClick={() => handleSort("date")} className="whitespace-nowrap">
                Datum <SortIcon column="date" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("eventName")} className="whitespace-nowrap">
                Tävling <SortIcon column="eventName" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("eventType")} className="whitespace-nowrap">
                Typ <SortIcon column="eventType" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("name")} className="whitespace-nowrap">
                Namn <SortIcon column="name" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("personId")} className="whitespace-nowrap">
                Person-id <SortIcon column="personId" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("birthYear")} className="whitespace-nowrap">
                Födelseår <SortIcon column="birthYear" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("class")} className="whitespace-nowrap">
                Klass <SortIcon column="class" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("length")} className="whitespace-nowrap">
                Längd <SortIcon column="length" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("time")} className="whitespace-nowrap">
                Tid <SortIcon column="time" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("timeAfterWinner")} className="whitespace-nowrap">
                Tid efter segraren <SortIcon column="timeAfterWinner" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("position")} className="whitespace-nowrap">
                Plac <SortIcon column="position" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("totalParticipants")} className="whitespace-nowrap">
                Antal <SortIcon column="totalParticipants" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("started")} className="whitespace-nowrap">
                Startat <SortIcon column="started" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("organizer")} className="whitespace-nowrap">
                Arrangör <SortIcon column="organizer" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-4">
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
                  <TableCell>{displayValue(result.personId)}</TableCell>
                  <TableCell>{displayValue(result.birthYear)}</TableCell>
                  <TableCell>{displayValue(result.class)}</TableCell>
                  <TableCell>{result.length ? `${result.length} m` : "-"}</TableCell>
                  <TableCell>{displayValue(result.time)}</TableCell>
                  <TableCell>{displayValue(result.timeAfterWinner)}</TableCell>
                  <TableCell>{displayValue(result.position)}</TableCell>
                  <TableCell>{displayValue(result.totalParticipants)}</TableCell>
                  <TableCell>{displayValue(result.started)}</TableCell>
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
