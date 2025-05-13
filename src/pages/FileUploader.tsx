
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onFileSelect?: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  multiple?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  accept = { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
  maxSize = 5000000, // 5MB default
  multiple = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      if (onFileSelect) {
        onFileSelect(file);
      }
      toast({
        title: "File selected",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple
  });

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.name} className="text-red-500 text-sm mt-1">
      {file.name} - {errors.map(e => e.message).join(', ')}
    </li>
  ));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 cursor-pointer flex flex-col items-center justify-center transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary/50'}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-primary">Drop the file here...</p>
          ) : (
            <div className="text-center">
              <p className="mb-2">Drag and drop a file here, or click to select</p>
              <p className="text-sm text-muted-foreground">
                Excel files only (.xlsx, .xls)
              </p>
            </div>
          )}

          {selectedFile && (
            <div className="mt-4 text-sm">
              <p className="font-medium">Selected file:</p>
              <p>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
            </div>
          )}

          {fileRejectionItems.length > 0 && (
            <ul className="mt-2">{fileRejectionItems}</ul>
          )}

          <Button 
            type="button" 
            className="mt-4" 
            disabled={!selectedFile} 
            onClick={(e) => {
              e.stopPropagation();
              if (selectedFile && onFileSelect) {
                onFileSelect(selectedFile);
                toast({
                  title: "Processing file",
                  description: "Your file is being processed",
                });
              }
            }}
          >
            Process File
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploader;
