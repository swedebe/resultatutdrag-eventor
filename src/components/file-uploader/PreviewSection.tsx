
import React from "react";
import ResultsPreview from "@/components/ResultsPreview";
import RunSettingsSection from "./RunSettingsSection";
import ActionButtonsSection from "./ActionButtonsSection";
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
  isSaving: boolean;
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
  isSaving,
}) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <>
      <ResultsPreview results={results} />
      <RunSettingsSection
        saveName={saveName}
        onSaveNameChange={onSaveNameChange}
        onRenameRun={onRenameRun}
        isRenaming={isRenaming}
        runId={runId}
      />
      <ActionButtonsSection
        onSaveResults={onSaveResults}
        onExportResults={onExportResults}
        onDeleteRun={onDeleteRun}
        isSaving={isSaving}
        resultsLength={results.length}
        runId={runId}
      />
    </>
  );
};

export default PreviewSection;
