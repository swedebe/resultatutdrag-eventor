
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
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

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{infoTitle}</CardTitle>
        <CardDescription>{infoDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{nameLabel}</p>
            <p className="font-medium">{run.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{eventCountLabel}</p>
            <p className="font-medium">{run.event_count}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{resultCountLabel}</p>
            <p className="font-medium">{totalCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
            <p className="font-medium">{formatDate(run.date)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {totalResultsText.replace('{0}', `${totalCount}`)}
        </p>
      </CardContent>
    </Card>
  );
};

export default RunInfoCard;

