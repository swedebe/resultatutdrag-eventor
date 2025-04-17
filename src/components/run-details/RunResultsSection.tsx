
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ResultsTable from "@/components/ResultsTable";
import { ResultRow } from "@/services/FileProcessingService";

interface RunResultsSectionProps {
  results: ResultRow[];
  totalCount: number;
}

const RunResultsSection: React.FC<RunResultsSectionProps> = ({ results, totalCount }) => {
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Inga resultat finns tillgängliga för denna körning.</p>
        </CardContent>
      </Card>
    );
  }

  return <ResultsTable results={results} />;
};

export default RunResultsSection;
