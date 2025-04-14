
/**
 * Utilities for extracting event information
 */

/**
 * Extracts event name and organizer information from HTML
 * Organizer name is found in <span class="ol_InlineIcon">
 * Event name is found in the title tag, after "för"
 */
export const extractEventAndOrganizerInfo = (html: string): { eventName: string; organizer: string } => {
  // Default values if nothing is found
  let eventName = "Okänd tävling";
  let organizer = "";
  
  // Parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // Extract event name from title (text after "för")
  const titleElement = doc.querySelector("title");
  if (titleElement && titleElement.textContent) {
    const titleText = titleElement.textContent;
    const matchForText = titleText.match(/för\s+(.*?)$/i);
    if (matchForText && matchForText[1]) {
      eventName = matchForText[1].trim();
    }
  }
  
  // Extract organizer from span with class="ol_InlineIcon"
  const organizerSpan = doc.querySelector("span.ol_InlineIcon");
  if (organizerSpan && organizerSpan.textContent) {
    organizer = organizerSpan.textContent.trim();
  }
  
  // Fallback: Look for organizer using previous patterns if not found
  if (!organizer) {
    // Look for "Arrangör:" in the page
    const organizerMatch = html.match(/Arrangör(?:sorganisation)?:[^\n<]*([^<\n]+)/i);
    if (organizerMatch && organizerMatch[1]) {
      organizer = organizerMatch[1].trim();
    }
    
    // Try alternative pattern
    if (!organizer) {
      const altOrganizerMatch = html.match(/Arrangerad av[^\n<]*([^<\n]+)/i);
      if (altOrganizerMatch && altOrganizerMatch[1]) {
        organizer = altOrganizerMatch[1].trim();
      }
    }
  }
  
  return { eventName, organizer };
};
