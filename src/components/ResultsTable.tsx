
import React, { useState } from "react";
import { Table, TableCaption } from "@/components/ui/table";
import { ResultRow, exportResultsToExcel } from "@/services/FileProcessingService";
import { useToast } from "@/components/ui/use-toast";
import TableSearch from "./table/TableSearch";
import ResultsTableHeader from "./table/ResultsTableHeader";
import ResultsTableBody from "./table/ResultsTableBody";
import { filterResults, sortResults } from "@/utils/resultsUtils";

interface ResultsTableProps {
  results: ResultRow[];
}

const ResultsTable = ({ results }: ResultsTableProps) => {
  const [sortColumn, setSortColumn] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  const handleExportExcel = () => {
    exportResultsToExcel(results);
    toast({
      title: "Export slutförd",
      description: "Resultat exporterade till berikade_resultat.xlsx",
    });
  };
  
  const filteredResults = filterResults(results, searchTerm);
  const sortedResults = sortResults(filteredResults, sortColumn, sortDirection);

  return (
    <div className="mt-6 space-y-4">
      <TableSearch 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
        onExport={handleExportExcel} 
      />

      <div className="rounded-md border">
        <Table>
          <TableCaption>
            Totalt {filteredResults.length} resultat för klubben
          </TableCaption>
          <ResultsTableHeader 
            sortColumn={sortColumn} 
            sortDirection={sortDirection} 
            onSort={handleSort} 
          />
          <ResultsTableBody results={sortedResults} />
        </Table>
      </div>
    </div>
  );
};

export default ResultsTable;
