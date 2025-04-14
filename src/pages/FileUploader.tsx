
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import * as XLSX from 'xlsx';
import ResultsTable from "@/components/ResultsTable";
import { extractClassInfo } from "@/lib/eventor-parser/class-utils";
import { findCourseLength } from "@/lib/eventor-parser/course-utils";

interface ResultRow {
  name: string;
  class: string;
  eventId: string | number;
  eventName: string;
  date: string;
  time: string;
  position: number;
  organizer: string;
  timeInSeconds: number;
  timeAfterWinner: string;
  length?: number;
  totalParticipants?: number;
  eventType?: string;       // Arrangemangstyp
  personId?: string | number; // Person-id
  birthYear?: string | number; // Födelseår
  started?: string | boolean;  // Startat
  [key: string]: any;
}

const FileUploader = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      toast({
        title: "Fil vald",
        description: `Vald fil: ${e.target.files[0].name}`,
      });
    }
  };
  
  const processFile = async () => {
    if (!file) {
      toast({
        title: "Ingen fil vald",
        description: "Välj en fil först",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setCurrentStatus("Läser in fil...");
    
    try {
      // Läs in Excel-filen
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
      
      console.log("Parsed Excel data:", jsonData);
      
      setProgress(10);
      setCurrentStatus("Fil inläst, bearbetar data...");
      
      // Behandla varje rad
      const enrichedResults = [];
      let processedRows = 0;
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Hitta eventId - kan vara antingen "Tävlings-id" eller annan kolumn
        const eventId = row["Tävlings-id"] || row.eventId || null;
        
        if (!eventId) {
          console.warn("Rad saknar Tävlings-id, hoppar över:", row);
          continue;
        }
        
        // Förbered data för resultatraden
        let resultRow: ResultRow = {
          eventId: eventId,
          eventName: row["Tävling"] || row.eventName || "",
          organizer: row["Arrangör"] || row.organizer || "",
          date: row["Datum"] || row.date || "",
          class: row["Klass"] || row.class || "",
          name: `${row["Förnamn"] || ""} ${row["Efternamn"] || ""}`.trim() || row.name || "",
          position: parseInt(row["Placering"] || "0", 10) || 0,
          time: row["Tid"] || row.time || "",
          timeAfterWinner: row["Tid efter segraren"] || "",
          timeInSeconds: 0,
          length: 0,
          totalParticipants: 0,
          eventType: row["Arrangemangstyp"] || "",
          personId: row["Person-id"] || "",
          birthYear: row["Födelseår"] || "",
          started: row["Startat"] || ""
        };
        
        // Konvertera tid till sekunder
        const timeParts = resultRow.time.split(":");
        let timeInSeconds = 0;
        if (timeParts.length === 2) {
          timeInSeconds = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
        } else if (timeParts.length === 3) {
          timeInSeconds = parseInt(timeParts[0], 10) * 3600 + parseInt(timeParts[1], 10) * 60 + parseInt(timeParts[2], 10);
        }
        resultRow.timeInSeconds = timeInSeconds;
        
        setProgress(10 + Math.floor(80 * (i / jsonData.length)));
        setCurrentStatus(`Hämtar information för tävling ${eventId} (${i+1}/${jsonData.length})...`);
        
        try {
          // Hämta banlängd och antal startande från Eventor
          const eventorUrl = `https://eventor.orientering.se/Events/ResultList?eventId=${eventId}&groupBy=EventClass`;
          const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(eventorUrl)}`);
          const html = await response.text();
          
          // Skapa en tillfällig DOM för parsing
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          
          // Hitta klassen
          const className = resultRow.class;
          let courseLength = 0;
          let totalParticipants = 0;
          
          // Hitta tabell som innehåller klassen
          const tables = doc.querySelectorAll("table");
          let relevantTable = null;
          let foundClass = false;
          
          // Leta igenom tabeller och rubriker för att hitta rätt klass
          const classHeaders = Array.from(doc.querySelectorAll("h3"));
          for (const header of classHeaders) {
            if (header.textContent?.includes(className)) {
              foundClass = true;
              
              // Hitta närmaste tabell efter denna rubrik
              let element = header.nextElementSibling;
              while (element && element.tagName !== "TABLE") {
                element = element.nextElementSibling;
              }
              
              if (element && element.tagName === "TABLE") {
                relevantTable = element;
                
                // Försök hitta banlängd från rubriken
                const headerText = header.textContent || "";
                const lengthMatch = headerText.match(/(\d[\d\s]+)\s*m/i);
                if (lengthMatch && lengthMatch[1]) {
                  courseLength = parseInt(lengthMatch[1].replace(/\s/g, ''));
                }
                
                // Räkna antal rader i tabellen för att få antal startande
                if (relevantTable) {
                  const rows = relevantTable.querySelectorAll("tr");
                  totalParticipants = Math.max(0, rows.length - 1); // Ta bort rubrikraden
                }
                
                break;
              }
            }
          }
          
          // Om vi inte hittade via rubriker, leta genom tabeller direkt
          if (!foundClass && className) {
            for (const table of tables) {
              const caption = table.querySelector("caption");
              if (caption && caption.textContent?.includes(className)) {
                relevantTable = table;
                
                // Räkna antal rader för antal startande
                const rows = table.querySelectorAll("tr");
                totalParticipants = Math.max(0, rows.length - 1);
                
                // Leta efter banlängd i närliggande element
                if (caption.textContent) {
                  const lengthMatch = caption.textContent.match(/(\d[\d\s]+)\s*m/i);
                  if (lengthMatch && lengthMatch[1]) {
                    courseLength = parseInt(lengthMatch[1].replace(/\s/g, ''));
                  }
                }
                
                break;
              }
            }
          }
          
          // Uppdatera raden med den nya informationen
          resultRow.length = courseLength;
          resultRow.totalParticipants = totalParticipants;
          
          enrichedResults.push(resultRow);
          processedRows++;
        } catch (error) {
          console.error(`Fel vid hämtning för tävlings-id ${eventId}:`, error);
          // Lägg ändå till raden utan banlängd och antal startande
          enrichedResults.push(resultRow);
          processedRows++;
        }
      }
      
      setProgress(95);
      setCurrentStatus("Slutför bearbetning...");
      
      setResults(enrichedResults);
      
      toast({
        title: "Filbearbetning slutförd",
        description: `${processedRows} resultat bearbetade`,
      });
    } catch (error) {
      console.error("Fel vid bearbetning av fil:", error);
      toast({
        title: "Fel vid bearbetning",
        description: "Ett fel uppstod vid bearbetning av filen",
        variant: "destructive",
      });
    } finally {
      setProgress(100);
      setCurrentStatus("Klar!");
      setIsProcessing(false);
    }
  };
  
  const handleExport = () => {
    if (results.length === 0) {
      toast({
        title: "Inga resultat att exportera",
        description: "Ladda upp och bearbeta en fil först",
        variant: "destructive",
      });
      return;
    }
    
    // Skapa ett nytt arbetsdokument
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(results);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultat");
    
    // Exportera till fil
    XLSX.writeFile(workbook, "berikade_resultat.xlsx");
    
    toast({
      title: "Export slutförd",
      description: "Resultat exporterade till berikade_resultat.xlsx",
    });
  };
  
  const handleClearResults = () => {
    setResults([]);
    setFile(null);
    setProgress(0);
    setCurrentStatus("");
    
    toast({
      title: "Resultat rensade",
      description: "Alla resultat har tagits bort",
    });
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-6">Göingarna Resultatanalys - Filuppladdning</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ladda upp resultatfil (Excel)</CardTitle>
          <CardDescription>
            Ladda upp en Excel-fil med resultat för att automatiskt berika dem med banlängd och antal startande
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              
              <div className="flex gap-3">
                <Button 
                  onClick={processFile} 
                  disabled={!file || isProcessing}
                  className="w-40"
                >
                  {isProcessing ? "Bearbetar..." : "Bearbeta fil"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleExport}
                  disabled={results.length === 0 || isProcessing}
                  className="w-40"
                >
                  Exportera resultat
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleClearResults}
                  disabled={results.length === 0 && !file}
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
        </CardContent>
      </Card>
      
      {results.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Bearbetade resultat</CardTitle>
              <CardDescription>
                {results.length} resultat bearbetade, {results.filter(r => r.length && r.length > 0).length} med banlängd, {results.filter(r => r.totalParticipants && r.totalParticipants > 0).length} med antal startande
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Klass</TableHead>
                    <TableHead>Tävlings-id</TableHead>
                    <TableHead>Tävlingsnamn</TableHead>
                    <TableHead>Arrangör</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Banlängd</TableHead>
                    <TableHead>Antal startande</TableHead>
                    <TableHead>Placering</TableHead>
                    <TableHead>Tid</TableHead>
                    <TableHead>Tid efter segraren</TableHead>
                    <TableHead>Arrangemangstyp</TableHead>
                    <TableHead>Person-id</TableHead>
                    <TableHead>Födelseår</TableHead>
                    <TableHead>Startat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.slice(0, 10).map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>{result.class}</TableCell>
                      <TableCell>{result.eventId}</TableCell>
                      <TableCell>{result.eventName}</TableCell>
                      <TableCell>{result.organizer}</TableCell>
                      <TableCell>{result.date}</TableCell>
                      <TableCell>{result.length || "—"}</TableCell>
                      <TableCell>{result.totalParticipants || "—"}</TableCell>
                      <TableCell>{result.position}</TableCell>
                      <TableCell>{result.time}</TableCell>
                      <TableCell>{result.timeAfterWinner}</TableCell>
                      <TableCell>{result.eventType || "—"}</TableCell>
                      <TableCell>{result.personId || "—"}</TableCell>
                      <TableCell>{result.birthYear || "—"}</TableCell>
                      <TableCell>{result.started || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {results.length > 10 && (
                <div className="mt-2 text-center text-muted-foreground">
                  Visar 10 av {results.length} resultat
                </div>
              )}
            </CardContent>
          </Card>
          
          <ResultsTable results={results} />
        </>
      )}
    </div>
  );
};

export default FileUploader;
