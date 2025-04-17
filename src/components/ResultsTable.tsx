
import React, { useState } from "react";
import { Table } from "@/components/ui/table";
import ResultsTableHeader from "@/components/table/ResultsTableHeader";
import ResultsTableBody from "@/components/table/ResultsTableBody";
import { ResultRow } from "@/types/results";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination";
import { sortResults } from "@/utils/resultsUtils";

interface ResultsTableProps {
  results: ResultRow[];
}

const RESULTS_PER_PAGE = 100;

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Apply sorting to results
  const sortedResults = sortResults(results, sortColumn, sortDirection);
  
  const totalPages = Math.ceil(sortedResults.length / RESULTS_PER_PAGE);
  
  // Get paginated results
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * RESULTS_PER_PAGE, 
    currentPage * RESULTS_PER_PAGE
  );
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table when changing page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Default to ascending for new column
      setSortColumn(column);
      setSortDirection("asc");
    }
    
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };
  
  const renderPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5; // Show at most 5 page numbers
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust startPage if we're at the end of the range
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => handlePageChange(i)} 
            isActive={i === currentPage}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };
  
  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <ResultsTableHeader 
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <ResultsTableBody results={paginatedResults} />
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))} 
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {renderPaginationItems()}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} 
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Visar {((currentPage - 1) * RESULTS_PER_PAGE) + 1} - {Math.min(currentPage * RESULTS_PER_PAGE, results.length)} av {results.length} resultat
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;
