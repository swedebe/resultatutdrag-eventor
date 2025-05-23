
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllAppTexts } from "@/hooks/useAppText";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  onCancelProcessing
}) => {
  const { texts } = useAllAppTexts();
  const [edgeFunctionError, setEdgeFunctionError] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
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

  // Monitor current status for edge function errors
  React.useEffect(() => {
    if (currentStatus && currentStatus.includes("Edge function error")) {
      setEdgeFunctionError(true);
    } else if (currentStatus === "Klar!") {
      setEdgeFunctionError(false);
    }
  }, [currentStatus]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{texts.upload_title || "Filuppladdning"}</CardTitle>
        <CardDescription>
          {texts.upload_description || "Ladda upp en Excel-fil med resultat för att automatiskt berika dem..."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="file-upload">
              {texts.upload_label || "Ladda upp resultatfil (Excel)"}
            </Label>
            <input 
              id="file-upload"
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
          </div>
          
          {edgeFunctionError && (
            <Alert variant="destructive" className="my-2">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>
                Edge function för HTML-hämtning verkar inte fungera. Detta kan bero på att:
                <ul className="list-disc ml-5 mt-2">
                  <li>Edge function har inte deployas korrekt</li>
                  <li>Det är problem med nätverk eller CORS konfiguration</li>
                  <li>Supabase-projektet behöver startas om</li>
                </ul>
                Systemet kommer försöka med direkta anrop till Eventor istället.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-3 items-center">
            <Label htmlFor="delay-input">
              {texts.delay_label || "Delay mellan anrop (sekunder):"}
            </Label>
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
              {texts.delay_hint || "(Högre värde förhindrar rate-limiting från Eventor)"}
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={onProcessFile} 
              disabled={isProcessing || !file}
              className="w-40"
            >
              {isProcessing ? "Bearbetar..." : "Bearbeta fil"}
            </Button>
            
            {isProcessing ? (
              <Button 
                variant="destructive" 
                onClick={onCancelProcessing}
              >
                Avbryt
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={onClear}
                disabled={!hasResults && !isProcessing}
              >
                Rensa
              </Button>
            )}
          </div>
          
          {isProcessing && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{currentStatus}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadSection;
