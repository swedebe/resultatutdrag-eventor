
import React from "react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultRow } from "@/services/FileProcessingService";

interface ResultsPreviewProps {
  results: ResultRow[];
}

const ResultsPreview: React.FC<ResultsPreviewProps> = ({ results }) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Bearbetade resultat</CardTitle>
        <CardDescription>
          {results.length} resultat bearbetade, {results.filter(r => r.length && r.length > 0).length} med banlängd, {results.filter(r => r.totalParticipants && r.totalParticipants > 0).length} med antal startande
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>Klass</TableHead>
              <TableHead>Tävlings-id</TableHead>
              <TableHead>Tävlingsnamn</TableHead>
              <TableHead>Arrangör</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Banlängd</TableHead>
              <TableHead>Antal startande</TableHead>
              <TableHead>Placering</TableHead>
              <TableHead>Tid</TableHead>
              <TableHead>Tid efter segraren</TableHead>
              <TableHead>Arrangemangstyp</TableHead>
              <TableHead>Person-id</TableHead>
              <TableHead>Födelseår</TableHead>
              <TableHead>Startat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.slice(0, 10).map((result, index) => (
              <TableRow key={index}>
                <TableCell>{result.name}</TableCell>
                <TableCell>{result.class}</TableCell>
                <TableCell>{result.eventId}</TableCell>
                <TableCell>{result.eventName}</TableCell>
                <TableCell>{result.organizer}</TableCell>
                <TableCell>{result.date}</TableCell>
                <TableCell>{result.length || "—"}</TableCell>
                <TableCell>{result.totalParticipants || "—"}</TableCell>
                <TableCell>{result.position}</TableCell>
                <TableCell>{result.time}</TableCell>
                <TableCell>{result.timeAfterWinner}</TableCell>
                <TableCell>{result.eventType || "—"}</TableCell>
                <TableCell>{result.personId || "—"}</TableCell>
                <TableCell>{result.birthYear || "—"}</TableCell>
                <TableCell>{result.started || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {results.length > 10 && (
          <div className="mt-2 text-center text-muted-foreground">
            Visar 10 av {results.length} resultat
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsPreview;
