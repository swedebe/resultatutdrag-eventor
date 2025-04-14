
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
  
  // Extract event name from title 
  const titleElement = doc.querySelector("title");
  if (titleElement && titleElement.textContent) {
    const titleText = titleElement.textContent;
    
    // Try different patterns to extract the event name
    // Pattern 1: "resultatlista för X"
    const resultForPattern = titleText.match(/resultatlista\s+f[öo]r\s+([^-]+)/i);
    if (resultForPattern && resultForPattern[1]) {
      eventName = resultForPattern[1].trim();
      console.log("Found event name (pattern 1):", eventName);
    } 
    // Pattern 2: Looking for text after "för" at the end of title
    else {
      const matchForText = titleText.match(/f[öo]r\s+(.+?)$/iu);
      if (matchForText && matchForText[1]) {
        eventName = matchForText[1].trim();
        console.log("Found event name (pattern 2):", eventName);
      } else {
        // Pattern 3: Just take what's after "Eventor -" if nothing else works
        const dashPattern = titleText.match(/Eventor\s+-\s+(.+)/i);
        if (dashPattern && dashPattern[1]) {
          // Remove common prefixes like "Officiell resultatlista för"
          let candidate = dashPattern[1].trim();
          const prefixMatch = candidate.match(/^Officiell\s+resultatlista\s+f[öo]r\s+(.+)/i);
          if (prefixMatch && prefixMatch[1]) {
            eventName = prefixMatch[1].trim();
          } else {
            eventName = candidate;
          }
          console.log("Found event name (fallback):", eventName);
        } else {
          console.log("No match for event name in title:", titleText);
        }
      }
    }
  }
  
  // Extract organizer from span with class="ol_InlineIcon"
  const organizerSpan = doc.querySelector("span.ol_InlineIcon");
  if (organizerSpan && organizerSpan.textContent) {
    organizer = organizerSpan.textContent.trim();
    console.log("Found organizer from span:", organizer);
  }
  
  // Fallback: Look for organizer using previous patterns if not found
  if (!organizer) {
    // Look for "Arrangör:" in the page
    const organizerMatch = html.match(/Arrangör(?:sorganisation)?:[^\n<]*([^<\n]+)/i);
    if (organizerMatch && organizerMatch[1]) {
      organizer = organizerMatch[1].trim();
      console.log("Found organizer from 'Arrangör:' pattern:", organizer);
    }
    
    // Try alternative pattern
    if (!organizer) {
      const altOrganizerMatch = html.match(/Arrangerad av[^\n<]*([^<\n]+)/i);
      if (altOrganizerMatch && altOrganizerMatch[1]) {
        organizer = altOrganizerMatch[1].trim();
        console.log("Found organizer from 'Arrangerad av' pattern:", organizer);
      }
    }
  }
  
  return { eventName, organizer };
};
