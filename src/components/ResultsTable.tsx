
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
        valueA = a[sortColumn]?.toLowerCase() || "";
        valueB = b[sortColumn]?.toLowerCase() || "";
        break;
      case "time":
        valueA = a.timeInSeconds || Number.MAX_VALUE;
        valueB = b.timeInSeconds || Number.MAX_VALUE;
        break;
      case "diff":
        valueA = a.diffInSeconds || 0;
        valueB = b.diffInSeconds || 0;
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
              <TableHead role="button" onClick={() => handleSort("name")} className="whitespace-nowrap">
                Namn <SortIcon column="name" />
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
              <TableHead role="button" onClick={() => handleSort("diff")} className="whitespace-nowrap">
                Diff <SortIcon column="diff" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("position")} className="whitespace-nowrap">
                Plac <SortIcon column="position" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("totalParticipants")} className="whitespace-nowrap">
                Antal <SortIcon column="totalParticipants" />
              </TableHead>
              <TableHead role="button" onClick={() => handleSort("organizer")} className="whitespace-nowrap">
                Arrangör <SortIcon column="organizer" />
              </TableHead>
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
                  <TableCell>{result.date}</TableCell>
                  <TableCell>{result.eventName}</TableCell>
                  <TableCell>{result.name}</TableCell>
                  <TableCell>{result.class}</TableCell>
                  <TableCell>{result.length ? `${result.length} m` : "-"}</TableCell>
                  <TableCell>{result.time}</TableCell>
                  <TableCell>{result.diff}</TableCell>
                  <TableCell>{result.position || "-"}</TableCell>
                  <TableCell>{result.totalParticipants || "-"}</TableCell>
                  <TableCell>{result.organizer || "-"}</TableCell>
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
