
/**
 * Utilities for extracting event information
 */

/**
 * Extracts event name and organizer information from HTML
 * Organizer name always has "Tävlingens namn:" as prefix according to visual guidance
 */
export const extractEventAndOrganizerInfo = (html: string): { eventName: string; organizer: string } => {
  // Standardvärden om inget hittas
  let eventName = "Okänd tävling";
  let organizer = "";
  
  // Leta efter "Tävlingens namn:" i sidan (enligt den gröna ramen i bilden)
  const eventMatch = html.match(/Tävlingens namn:[^\n<]*([^<\n]+)/i);
  if (eventMatch && eventMatch[1]) {
    eventName = eventMatch[1].trim();
  }
  
  // Leta efter organisatören i närheten av tävlingsnamnet
  // Enligt bilden finns arrangören oftast under eller nära tävlingsnamnet
  const organizerMatch = html.match(/Arrangör(?:sorganisation)?:[^\n<]*([^<\n]+)/i);
  if (organizerMatch && organizerMatch[1]) {
    organizer = organizerMatch[1].trim();
  }
  
  // Om vi fortfarande inte har en organisatör, leta efter andra mönster
  if (!organizer) {
    const altOrganizerMatch = html.match(/Arrangerad av[^\n<]*([^<\n]+)/i);
    if (altOrganizerMatch && altOrganizerMatch[1]) {
      organizer = altOrganizerMatch[1].trim();
    }
  }
  
  // Om inget av ovanstående fungerar, leta i dokumentets struktur
  if (!eventName || !organizer) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Sök efter element som innehåller "Tävlingens namn:" eller "Arrangör:"
    const allElements = Array.from(doc.querySelectorAll("div, p, span, h1, h2, h3, h4, h5"));
    
    for (const element of allElements) {
      const text = element.textContent || "";
      
      if (!eventName && text.includes("Tävlingens namn:")) {
        const match = text.match(/Tävlingens namn:(.*?)(?:Arrangör|$)/i);
        if (match && match[1]) {
          eventName = match[1].trim();
        }
      }
      
      if (!organizer && text.includes("Arrangör")) {
        const match = text.match(/Arrangör(?:sorganisation)?:(.*)/i);
        if (match && match[1]) {
          organizer = match[1].trim();
        }
      }
    }
  }
  
  return { eventName, organizer };
};
