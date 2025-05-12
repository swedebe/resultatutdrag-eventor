
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface FileUploadSectionProps {
  onFileChange: (file: File | null) => void;
  isProcessing: boolean;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onFileChange,
  isProcessing,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-4">
        <Label htmlFor="file-upload" className="block mb-2">
          Ladda upp resultatfil (Excel)
        </Label>
        <Input
          id="file-upload"
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          disabled={isProcessing}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary file:text-white
            hover:file:bg-primary/90"
        />
      </div>
    </div>
  );
};

export default FileUploadSection;
