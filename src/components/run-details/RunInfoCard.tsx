
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunWithLogs } from "@/types/database";
import { ResultRow } from "@/types/results";
import { useAppText } from "@/hooks/useAppText";

interface RunInfoCardProps {
  run: RunWithLogs;
  results: ResultRow[];
  totalCount: number;
}

const RunInfoCard: React.FC<RunInfoCardProps> = ({ run, results, totalCount }) => {
  const { text: infoTitle } = useAppText('rundetails_info_title', 'Körningsinformation');
  const { text: infoDescription } = useAppText('rundetails_info_description', 'Information om denna analys');
  const { text: nameLabel } = useAppText('rundetails_name_label', 'Namn:');
  const { text: eventCountLabel } = useAppText('rundetails_event_count_label', 'Antal evenemang:');
  const { text: resultCountLabel } = useAppText('rundetails_result_count_label', 'Antal resultat:');
  const { text: dateLabel } = useAppText('rundetails_date_label', 'Datum:');
  const { text: totalResultsText } = useAppText('rundetails_total_results', 'Totalt {0} resultat för klubben');
  
  // Count unique event IDs
  const uniqueEventIds = new Set(results.map(result => result.eventId)).size;
  
  // Format total results text with actual count
  const formattedTotalResults = totalResultsText.replace('{0}', totalCount.toString());
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{infoTitle}</CardTitle>
        <CardDescription>{infoDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">{nameLabel}</p>
            <p className="text-lg">{run.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{dateLabel}</p>
            <p className="text-lg">{new Date(run.date).toLocaleString('sv-SE')}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{eventCountLabel}</p>
            <p className="text-lg">{uniqueEventIds}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{resultCountLabel}</p>
            <p className="text-lg">{totalCount}</p>
            <p className="text-sm text-muted-foreground">{formattedTotalResults}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RunInfoCard;
