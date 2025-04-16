
import React from "react";
import ResultsPreview from "@/components/ResultsPreview";
import { ResultRow } from "@/types/results";

interface PreviewSectionProps {
  results: ResultRow[];
  saveName: string;
  onSaveNameChange: (name: string) => void;
  onRenameRun: () => void;
  isRenaming: boolean;
  runId: string | null;
  onSaveResults: () => void;
  onExportResults: () => void;
  onDeleteRun: () => void;
  onCancelProcessing?: () => void;
  isSaving: boolean;
  isProcessing: boolean;
}

const PreviewSection: React.FC<PreviewSectionProps> = ({
  results,
  saveName,
  onSaveNameChange,
  onRenameRun,
  isRenaming,
  runId,
  onSaveResults,
  onExportResults,
  onDeleteRun,
  onCancelProcessing,
  isSaving,
  isProcessing,
}) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <ResultsPreview results={results} />
  );
};

export default PreviewSection;
