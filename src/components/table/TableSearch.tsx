
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";

interface TableSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onExport: () => void;
}

const TableSearch: React.FC<TableSearchProps> = ({ searchTerm, onSearchChange, onExport }) => {
  return (
    <div className="flex gap-2 justify-between">
      <div className="flex gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Sök på namn, klass eller tävling..." 
            value={searchTerm} 
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={() => onSearchChange("")}>
          Rensa
        </Button>
      </div>
      
      <Button 
        variant="outline" 
        onClick={onExport}
        className="flex gap-2 items-center"
      >
        <Download className="h-4 w-4" />
        Ladda ner som Excel
      </Button>
    </div>
  );
};

export default TableSearch;
