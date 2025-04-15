import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import * as XLSX from 'xlsx';
import ResultsTable from "@/components/ResultsTable";
import { extractClassInfo } from "@/lib/eventor-parser/class-utils";
import { findCourseLength, extractCourseInfo } from "@/lib/eventor-parser/course-utils";

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

interface LogEntry {
  timestamp: string;
  eventId: string | number;
  url: string;
  status: string;
}

const FileUploader = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      toast({
        title: "Fil vald",
        description: `Vald fil: ${e.target.files[0].name}`,
      });
    }
  };
  
  const addLog = (eventId: string | number, url: string, status: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setLogs(prev => [...prev, { timestamp, eventId, url, status }]);
    
    // Scroll to bottom of logs
    setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };
  
  const clearLogs = () => {
    setLogs([]);
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
    clearLogs();
    
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
          addLog(eventId, eventorUrl, "Påbörjar hämtning");
          
          const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(eventorUrl)}`);
          if (!response.ok) {
            addLog(eventId, eventorUrl, `Fel: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const html = await response.text();
          addLog(eventId, eventorUrl, `OK: ${html.length} tecken`);
          
          // Skapa en tillfällig DOM för parsing
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          
          // Hitta klassen
          const className = resultRow.class;
          addLog(eventId, eventorUrl, `Söker klass: "${className}"`);
          
          // Directly look for eventClassHeader div with the specific format
          addLog(eventId, eventorUrl, `Söker efter eventClassHeader för klass "${className}"`);
          
          // Use our new utility function to extract course info from eventClassHeader
          const courseInfo = extractCourseInfo(html, className);
          
          if (courseInfo.length > 0 && courseInfo.participants > 0) {
            addLog(eventId, eventorUrl, `Hittade via eventClassHeader: Längd=${courseInfo.length}m, Antal=${courseInfo.participants}`);
            resultRow.length = courseInfo.length;
            resultRow.totalParticipants = courseInfo.participants;
          } else {
            // Fallback to previous methods if eventClassHeader extraction fails
            addLog(eventId, eventorUrl, `Kunde inte hitta via eventClassHeader, försöker med fallback-metoder`);
            
            let courseLength = 0;
            let totalParticipants = 0;
            
            // Hitta tabell som innehåller klassen
            const tables = doc.querySelectorAll("table");
            addLog(eventId, eventorUrl, `Hittade ${tables.length} tabeller`);
            
            let relevantTable = null;
            let foundClass = false;
            
            // Leta igenom tabeller och rubriker för att hitta rätt klass
            const classHeaders = Array.from(doc.querySelectorAll("h3"));
            addLog(eventId, eventorUrl, `Söker i ${classHeaders.length} rubriker`);
            
            for (const header of classHeaders) {
              if (header.textContent?.includes(className)) {
                foundClass = true;
                addLog(eventId, eventorUrl, `Hittade klass i rubrik: "${header.textContent}"`);
                
                // Check if this is within an eventClassHeader
                let parent = header.parentElement;
                while (parent && !parent.classList.contains('eventClassHeader') && parent !== doc.body) {
                  parent = parent.parentElement;
                }
                
                // If we found an eventClassHeader, extract info from its text
                if (parent && parent.classList.contains('eventClassHeader')) {
                  const headerText = parent.textContent || "";
                  addLog(eventId, eventorUrl, `Hittade eventClassHeader: "${headerText}"`);
                  
                  // Extract length and participants using regex
                  const infoMatch = headerText.match(/(\d[\d\s]+)\s*m,\s*(\d+)\s+startande/i);
                  if (infoMatch) {
                    courseLength = parseInt(infoMatch[1].replace(/\s/g, ''));
                    totalParticipants = parseInt(infoMatch[2], 10);
                    addLog(eventId, eventorUrl, `Extraherade från eventClassHeader: Längd=${courseLength}m, Antal=${totalParticipants}`);
                  }
                }
                
                // Hitta närmaste tabell efter denna rubrik
                if (!courseLength || !totalParticipants) {
                  let element = header.nextElementSibling;
                  while (element && element.tagName !== "TABLE") {
                    element = element.nextElementSibling;
                  }
                  
                  if (element && element.tagName === "TABLE") {
                    relevantTable = element;
                    
                    // Försök hitta banlängd från rubriken om vi inte hittade den i eventClassHeader
                    if (!courseLength) {
                      const headerText = header.textContent || "";
                      const lengthMatch = headerText.match(/(\d[\d\s]+)\s*m/i);
                      if (lengthMatch && lengthMatch[1]) {
                        courseLength = parseInt(lengthMatch[1].replace(/\s/g, ''));
                        addLog(eventId, eventorUrl, `Hittade banlängd i rubrik: ${courseLength}m`);
                      }
                    }
                    
                    // Räkna antal rader i tabellen för att få antal startande om vi inte hittade det i eventClassHeader
                    if (!totalParticipants && relevantTable) {
                      const rows = relevantTable.querySelectorAll("tr");
                      totalParticipants = Math.max(0, rows.length - 1); // Ta bort rubrikraden
                      addLog(eventId, eventorUrl, `Hittade antal startande: ${totalParticipants}`);
                    }
                    
                    break;
                  }
                }
              }
            }
            
            // Om vi inte hittade via rubriker, leta genom tabeller direkt
            if (!foundClass && className) {
              addLog(eventId, eventorUrl, `Söker klass i tabellbeskrivningar`);
              for (const table of tables) {
                const caption = table.querySelector("caption");
                if (caption && caption.textContent?.includes(className)) {
                  relevantTable = table;
                  addLog(eventId, eventorUrl, `Hittade klass i tabellbeskrivning: "${caption.textContent}"`);
                  
                  // Räkna antal rader för antal startande
                  const rows = table.querySelectorAll("tr");
                  totalParticipants = Math.max(0, rows.length - 1);
                  addLog(eventId, eventorUrl, `Hittade antal startande: ${totalParticipants}`);
                  
                  // Leta efter banlängd i närliggande element
                  if (caption.textContent) {
                    const lengthMatch = caption.textContent.match(/(\d[\d\s]+)\s*m/i);
                    if (lengthMatch && lengthMatch[1]) {
                      courseLength = parseInt(lengthMatch[1].replace(/\s/g, ''));
                      addLog(eventId, eventorUrl, `Hittade banlängd i tabellbeskrivning: ${courseLength}m`);
                    }
                  }
                  
                  break;
                }
              }
            }
            
            // Om vi fortfarande inte hittat någon information, sök i alla textsträngar
            if ((!courseLength || !totalParticipants) && className) {
              addLog(eventId, eventorUrl, `Söker i hela HTML-dokumentet`);
              
              // Leta efter text som innehåller klassnamnet och eventuell banlängd
              const bodyText = doc.body.textContent || "";
              const classPattern = new RegExp(`${className}[\\s\\S]{0,100}(\\d[\\d\\s]+)\\s*m`, 'i');
              const fullMatch = bodyText.match(classPattern);
              
              if (fullMatch && fullMatch[1]) {
                courseLength = parseInt(fullMatch[1].replace(/\s/g, ''));
                addLog(eventId, eventorUrl, `Hittade banlängd i text: ${courseLength}m`);
              }
              
              // Räkna deltagare genom att hitta rader som innehåller klassnamnet
              if (!totalParticipants) {
                const rows = doc.querySelectorAll('tr');
                let count = 0;
                
                rows.forEach(row => {
                  if (row.textContent?.includes(className)) {
                    count++;
                  }
                });
                
                if (count > 0) {
                  totalParticipants = count;
                  addLog(eventId, eventorUrl, `Räknade träffar för klassnamn: ${totalParticipants}`);
                }
              }
            }
            
            // Uppdatera raden med den nya informationen
            resultRow.length = courseLength;
            resultRow.totalParticipants = totalParticipants;
          }
          
          if (!resultRow.length && !resultRow.totalParticipants) {
            addLog(eventId, eventorUrl, `VARNING: Kunde inte hitta data för klassen "${className}"`);
          } else {
            addLog(eventId, eventorUrl, `Slutresultat - Längd: ${resultRow.length}m, Antal startande: ${resultRow.totalParticipants}`);
          }
          
          enrichedResults.push(resultRow);
          processedRows++;
        } catch (error) {
          console.error(`Fel vid hämtning för tävlings-id ${eventId}:`, error);
          addLog(eventId, "", `Fel vid hämtning: ${error}`);
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
      addLog("", "", `Fel vid bearbetning: ${error}`);
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
    clearLogs();
    
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
      
      {logs.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>URL-loggning</CardTitle>
              <CardDescription>
                Loggning av förfrågningar till Eventor
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              Rensa logg
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md max-h-[300px] overflow-y-auto text-xs font-mono">
              {logs.map((log, index) => (
                <div key={index} className={`py-1 ${index % 2 === 0 ? 'bg-muted/50' : ''}`}>
                  <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
                  <span className="text-blue-500">[ID {log.eventId}]</span>{' '}
                  {log.url && <span className="text-green-500">{log.url.substring(0, 60)}...</span>}{' '}
                  <span>{log.status}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      )}
      
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
