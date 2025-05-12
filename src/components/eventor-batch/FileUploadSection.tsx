
import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAllAppTexts } from "@/hooks/useAppText";
import { FileText } from "lucide-react";

interface FileUploadSectionProps {
  file: File | null;
  setFile: (file: File | null) => void;
  isProcessing: boolean;
  fetchCourseLength: boolean;
  setFetchCourseLength: (value: boolean) => void;
  fetchStarters: boolean;
  setFetchStarters: (value: boolean) => void;
  courseLengthDelay: number;
  setCourseLengthDelay: (value: number) => void;
  startersDelay: number;
  setStartersDelay: (value: number) => void;
  progress: number;
  currentStatus: string;
  onProcessFile: () => void;
  onClearResults: () => void;
  onCancelProcessing: () => void;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  file,
  setFile,
  isProcessing,
  fetchCourseLength,
  setFetchCourseLength,
  fetchStarters,
  setFetchStarters,
  courseLengthDelay,
  setCourseLengthDelay,
  startersDelay,
  setStartersDelay,
  progress,
  currentStatus,
  onProcessFile,
  onClearResults,
  onCancelProcessing
}) => {
  const { toast } = useToast();
  const { texts } = useAllAppTexts();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="file-upload">
          {texts.eventorbatch_upload_label || "Ladda upp resultatfil (Excel)"}
        </Label>
        <div className="flex items-center gap-2">
          <input 
            id="file-upload"
            type="file" 
            accept=".xlsx, .xls" 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setFile(e.target.files[0]);
                toast({
                  title: "Fil vald",
                  description: `Vald fil: ${e.target.files[0].name}`,
                });
              } else {
                setFile(null);
              }
            }}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary/90"
          />
          {file && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {file.name}
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4 mt-2">
        <div className="space-y-2 border p-4 rounded-md">
          <h3 className="text-lg font-medium">{texts.eventorbatch_options_title || "Bearbetningsalternativ"}</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="fetch-course-length" 
              checked={fetchCourseLength}
              onCheckedChange={(checked) => {
                setFetchCourseLength(checked === true);
              }}
              disabled={isProcessing}
            />
            <Label htmlFor="fetch-course-length">{texts.eventorbatch_fetch_course_length || "Hämta banlängder (scraping)"}</Label>
            
            <div className="ml-4 flex items-center space-x-2">
              <Label htmlFor="course-length-delay">{texts.eventorbatch_delay_label || "Fördröjning:"}</Label>
              <Input 
                id="course-length-delay"
                type="number" 
                min="0"
                step="0.01"
                value={courseLengthDelay} 
                onChange={(e) => {
                  const newDelay = parseFloat(e.target.value) || 0;
                  if (newDelay >= 0) {
                    setCourseLengthDelay(newDelay);
                  }
                }}
                className="w-20"
                disabled={isProcessing || !fetchCourseLength}
              />
              <span className="text-sm">sekunder</span>
              <div className="text-xs text-muted-foreground">
                {texts.eventorbatch_delay_hint || "(Högre värde förhindrar rate-limiting från Eventor)"}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="fetch-starters" 
              checked={fetchStarters}
              onCheckedChange={(checked) => {
                setFetchStarters(checked === true);
              }}
              disabled={isProcessing}
            />
            <Label htmlFor="fetch-starters">{texts.eventorbatch_fetch_starters || "Hämta antal startande (API)"}</Label>
            
            <div className="ml-4 flex items-center space-x-2">
              <Label htmlFor="starters-delay">{texts.eventorbatch_delay_label || "Fördröjning:"}</Label>
              <Input 
                id="starters-delay"
                type="number" 
                min="0"
                step="0.01"
                value={startersDelay} 
                onChange={(e) => {
                  const newDelay = parseFloat(e.target.value) || 0;
                  if (newDelay >= 0) {
                    setStartersDelay(newDelay);
                  }
                }}
                className="w-20"
                disabled={isProcessing || !fetchStarters}
              />
              <span className="text-sm">sekunder</span>
              <div className="text-xs text-muted-foreground">
                {texts.eventorbatch_delay_hint || "(Högre värde förhindrar rate-limiting från Eventor)"}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 mt-2">
        <Button 
          onClick={onProcessFile} 
          disabled={isProcessing || !file}
          className="w-40"
        >
          {isProcessing ? texts.eventorbatch_processing || "Bearbetar..." : texts.eventorbatch_process_file || "Bearbeta fil"}
        </Button>
        
        {isProcessing ? (
          <Button 
            variant="destructive" 
            onClick={onCancelProcessing}
          >
            {texts.eventorbatch_cancel || "Avbryt"}
          </Button>
        ) : (
          <Button 
            variant="outline" 
            onClick={onClearResults}
            disabled={!file}
          >
            {texts.eventorbatch_clear || "Rensa"}
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
  );
};

export default FileUploadSection;
