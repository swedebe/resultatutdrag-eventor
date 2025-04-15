
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileUploadFormProps {
  isProcessing: boolean;
  progress: number;
  currentStatus: string;
  onFileChange: (file: File | null) => void;
  onProcessFile: () => void;
  onClear: () => void;
  hasResults: boolean;
  delay: number;
  onDelayChange: (delay: number) => void;
}

const FileUploadForm: React.FC<FileUploadFormProps> = ({
  isProcessing,
  progress,
  currentStatus,
  onFileChange,
  onProcessFile,
  onClear,
  hasResults,
  delay,
  onDelayChange
}) => {
  const { toast } = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
      toast({
        title: "Fil vald",
        description: `Vald fil: ${e.target.files[0].name}`,
      });
    } else {
      onFileChange(null);
    }
  };

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDelay = parseInt(e.target.value, 10) || 0;
    if (newDelay >= 0) {
      onDelayChange(newDelay);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary file:text-white
            hover:file:bg-primary/90"
        />
        
        <div className="flex gap-3 items-center">
          <Label htmlFor="delay-input" className="whitespace-nowrap">Delay mellan anrop (sekunder):</Label>
          <Input 
            id="delay-input"
            type="number" 
            min="0"
            value={delay} 
            onChange={handleDelayChange}
            className="w-20"
            disabled={isProcessing}
          />
          <div className="text-xs text-muted-foreground">
            (Högre värde förhindrar rate-limiting från Eventor)
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={onProcessFile} 
            disabled={isProcessing}
            className="w-40"
          >
            {isProcessing ? "Bearbetar..." : "Bearbeta fil"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClear}
            disabled={!hasResults && !isProcessing}
          >
            Rensa
          </Button>
        </div>
        
        {isProcessing && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{currentStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadForm;
