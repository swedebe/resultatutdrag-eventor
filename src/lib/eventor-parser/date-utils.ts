
/**
 * Utilities for extracting dates
 */

/**
 * Extracts date from various formats that may be found in Eventor's HTML
 */
export const extractDate = (html: string): string => {
  // Försök först hitta datum i ISO-format (YYYY-MM-DD)
  const isoMatch = html.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  
  // Försök hitta datum i format "DD månad YYYY" (svenska)
  const monthNames = ["januari", "februari", "mars", "april", "maj", "juni", 
                     "juli", "augusti", "september", "oktober", "november", "december"];
  
  const swedishDateRegex = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthNames.join('|')})\\s+(\\d{4})\\b`, 'i'
  );
  
  const swedishMatch = html.match(swedishDateRegex);
  if (swedishMatch) {
    const day = swedishMatch[1].padStart(2, '0');
    const monthIndex = monthNames.findIndex(m => 
      m.toLowerCase() === swedishMatch[2].toLowerCase()
    ) + 1;
    const month = String(monthIndex).padStart(2, '0');
    const year = swedishMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Sista försöket - hitta datum i rubrikområdet
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Kolla om det finns datum i sidhuvudet
  const headers = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5'));
  for (const header of headers) {
    const text = header.textContent || '';
    // Försök med ISO-format igen
    const headerIsoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (headerIsoMatch) return headerIsoMatch[1];
    
    // Försök med svenskt format igen
    const headerSwedishMatch = text.match(swedishDateRegex);
    if (headerSwedishMatch) {
      const day = headerSwedishMatch[1].padStart(2, '0');
      const monthIndex = monthNames.findIndex(m => 
        m.toLowerCase() === headerSwedishMatch[2].toLowerCase()
      ) + 1;
      const month = String(monthIndex).padStart(2, '0');
      const year = headerSwedishMatch[3];
      return `${year}-${month}-${day}`;
    }
  }
  
  // Om inget datum hittades
  return "";
};
