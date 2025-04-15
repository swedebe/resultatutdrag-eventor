
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunWithLogs } from "@/types/database";

interface RunInfoCardProps {
  run: RunWithLogs;
  resultsCount: number;
}

const RunInfoCard: React.FC<RunInfoCardProps> = ({ run, resultsCount }) => {
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
            <p className="text-lg">{run.event_count}</p>
          </div>
          {run.club_name && (
            <div>
              <p className="text-sm font-medium">Klubb:</p>
              <p className="text-lg">{run.club_name}</p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">Antal resultat:</p>
          <p className="text-lg">{resultsCount}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RunInfoCard;
