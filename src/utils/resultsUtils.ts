
import { ResultRow } from "@/services/FileProcessingService";

export const filterResults = (results: ResultRow[], searchTerm: string): ResultRow[] => {
  if (!searchTerm) return results;
  
  const searchTermLower = searchTerm.toLowerCase();
  return results.filter(result => (
    (typeof result.name === 'string' && result.name.toLowerCase().includes(searchTermLower)) ||
    (typeof result.class === 'string' && result.class.toLowerCase().includes(searchTermLower)) ||
    (typeof result.eventName === 'string' && result.eventName.toLowerCase().includes(searchTermLower)) ||
    (typeof result.organizer === 'string' && result.organizer.toLowerCase().includes(searchTermLower))
  ));
};

export const sortResults = (results: ResultRow[], sortColumn: string, sortDirection: string): ResultRow[] => {
  return [...results].sort((a, b) => {
    let valueA, valueB;

    switch (sortColumn) {
      case "name":
      case "class":
      case "eventName":
      case "organizer":
      case "eventType":
        valueA = typeof a[sortColumn] === 'string' ? (a[sortColumn] as string).toLowerCase() : '';
        valueB = typeof b[sortColumn] === 'string' ? (b[sortColumn] as string).toLowerCase() : '';
        break;
      case "personId":
      case "birthYear":
        valueA = a[sortColumn] || '';
        valueB = b[sortColumn] || '';
        break;
      case "started":
        valueA = a[sortColumn]?.toString() || '';
        valueB = b[sortColumn]?.toString() || '';
        break;
      case "time":
        valueA = a.timeInSeconds || Number.MAX_VALUE;
        valueB = b.timeInSeconds || Number.MAX_VALUE;
        break;
      case "position":
      case "totalParticipants":
      case "length":
        valueA = a[sortColumn] || 0;
        valueB = b[sortColumn] || 0;
        break;
      case "date":
        valueA = new Date(a.date).getTime();
        valueB = new Date(b.date).getTime();
        break;
      default:
        valueA = a[sortColumn] || "";
        valueB = b[sortColumn] || "";
    }

    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
};
