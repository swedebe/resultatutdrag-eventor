
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ResultsTable from "@/components/ResultsTable";
import { ResultRow } from "@/types/results";
import { useAppText } from "@/hooks/useAppText";

interface RunResultsSectionProps {
  results: ResultRow[];
  totalCount: number;
}

const RunResultsSection: React.FC<RunResultsSectionProps> = ({ results, totalCount }) => {
  const { text: emptyResultsText } = useAppText('rundetails_empty_results', 'Inga resultat finns tillgängliga för denna körning.');
  
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{emptyResultsText}</p>
        </CardContent>
      </Card>
    );
  }

  return <ResultsTable results={results} />;
};

export default RunResultsSection;
