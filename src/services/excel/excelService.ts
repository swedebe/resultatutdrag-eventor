
/**
 * Excel import and export operations
 */
import * as XLSX from 'xlsx';
import { ResultRow } from '@/types/results';

/**
 * Parse Excel file into JSON data
 */
export const parseExcelFile = async (file: File): Promise<any[]> => {
  const fileData = await file.arrayBuffer();
  const workbook = XLSX.read(fileData);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
  
  console.log("Parsed Excel data:", jsonData);
  return jsonData;
};

/**
 * Map raw Excel data to ResultRow format
 */
export const mapExcelRowToResultRow = (row: any): ResultRow => {
  // Find eventId - can be either "Tävlings-id" or another column
  const eventId = row["Tävlings-id"] || row.eventId || null;
  
  if (!eventId) {
    console.warn("Row missing eventId, skipping:", row);
    throw new Error("Missing eventId in row");
  }
  
  // Prepare data for the result row
  const resultRow: ResultRow = {
    eventId: eventId,
    eventName: row["Tävling"] || row.eventName || "",
    organizer: row["Arrangör"] || row.organizer || "",
    date: row["Datum"] || row.date || "",
    class: row["Klass"] || row.class || "",
    classType: row["Klasstyp"] || row.classType || "",
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
  
  // Convert time to seconds
  const timeParts = resultRow.time.split(":");
  let timeInSeconds = 0;
  if (timeParts.length === 2) {
    timeInSeconds = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
  } else if (timeParts.length === 3) {
    timeInSeconds = parseInt(timeParts[0], 10) * 3600 + parseInt(timeParts[1], 10) * 60 + parseInt(timeParts[2], 10);
  }
  resultRow.timeInSeconds = timeInSeconds;
  
  return resultRow;
};

/**
 * Export ResultRow array to Excel file
 */
export const exportResultsToExcel = (results: ResultRow[]): void => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(results);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultat");
  
  // Export to file
  XLSX.writeFile(workbook, "berikade_resultat.xlsx");
};
