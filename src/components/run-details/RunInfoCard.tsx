
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunWithLogs } from "@/types/database";
import { ResultRow } from "@/types/results";

interface RunInfoCardProps {
  run: RunWithLogs;
  results: ResultRow[];
}

const RunInfoCard: React.FC<RunInfoCardProps> = ({ run, results }) => {
  // Count unique event IDs
  const uniqueEventIds = new Set(results.map(result => result.eventId)).size;
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Körningsinformation</CardTitle>
        <CardDescription>Information om denna analys</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Namn:</p>
            <p className="text-lg">{run.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Datum:</p>
            <p className="text-lg">{new Date(run.date).toLocaleString('sv-SE')}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Antal evenemang:</p>
            <p className="text-lg">{uniqueEventIds}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">Antal resultat:</p>
          <p className="text-lg">{results.length}</p>
          <p className="text-sm text-muted-foreground">Totalt {results.length} resultat för klubben</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RunInfoCard;
