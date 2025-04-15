
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FileUploadForm from "@/components/FileUploadForm";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

interface FileUploadSectionProps {
  isProcessing: boolean;
  progress: number;
  currentStatus: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onProcessFile: () => void;
  onClear: () => void;
  hasResults: boolean;
  delay: number;
  onDelayChange: (delay: number) => void;
  onCancelProcessing: () => void;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  isProcessing,
  progress,
  currentStatus,
  file,
  onFileChange,
  onProcessFile,
  onClear,
  hasResults,
  delay,
  onDelayChange,
  onCancelProcessing,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Ladda upp resultatfil (Excel)</CardTitle>
        <CardDescription>
          Ladda upp en Excel-fil med resultat för att automatiskt berika dem med banlängd och antal startande
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUploadForm
          isProcessing={isProcessing}
          progress={progress}
          currentStatus={currentStatus}
          onFileChange={onFileChange}
          onProcessFile={onProcessFile}
          onClear={onClear}
          hasResults={hasResults}
          delay={delay}
          onDelayChange={onDelayChange}
        />
        
        {isProcessing && (
          <Button 
            variant="destructive" 
            onClick={onCancelProcessing}
            className="mt-4"
          >
            <XCircle className="mr-2 h-4 w-4" /> Avbryt körning
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUploadSection;
