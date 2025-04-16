
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import FileUploadSection from "@/components/file-uploader/FileUploadSection";
import PreviewSection from "@/components/file-uploader/PreviewSection";
import ActionButtonsSection from "@/components/file-uploader/ActionButtonsSection";
import RunSettingsSection from "@/components/file-uploader/RunSettingsSection";
import { useAllAppTexts } from "@/hooks/useAppText";

const FileUploader = () => {
  const { texts } = useAllAppTexts();
  const uploadTitle = texts['upload_title'] || 'Resultatanalys – Filuppladdning';
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">{uploadTitle}</h1>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Tillbaka till startsidan
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FileUploadSection />
          <PreviewSection />
        </div>
        <div className="space-y-6">
          <RunSettingsSection />
          <ActionButtonsSection />
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
