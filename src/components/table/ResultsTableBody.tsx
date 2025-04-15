
import React from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ResultRow } from "@/services/FileProcessingService";

interface ResultsTableBodyProps {
  results: ResultRow[];
}

const ResultsTableBody: React.FC<ResultsTableBodyProps> = ({ results }) => {
  const displayValue = (value: any, suffix: string = ''): string => {
    if (value === null || value === undefined || value === '' || value === 0) {
      return "-";
    }
    return `${value}${suffix}`;
  };

  return (
    <TableBody>
      {results.length === 0 ? (
        <TableRow>
          <TableCell colSpan={10} className="text-center py-4">
            Inga resultat hittades
          </TableCell>
        </TableRow>
      ) : (
        results.map((result, index) => (
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
  );
};

export default ResultsTableBody;
