/**
 * Utilities for extracting course information
 */

/**
 * Extracts course length from text, e.g. "4.5 km" or "4 500 m" to meters
 */
export const extractCourseLength = (lengthText: string): number => {
  if (!lengthText) return 0;
  
  // Log raw input for debugging
  console.log(`[DEBUG] Raw length text input: "${lengthText}"`);
  
  // Clean unwanted characters and trim
  const cleanedText = lengthText.replace(/[^\d\s.,km]/gi, '').trim();
  console.log(`[DEBUG] Cleaned length text: "${cleanedText}"`);
  
  // Look for km format (e.g. "4.5 km")
  let kmMatch = cleanedText.match(/([\d.,]+)\s*km/i);
  if (kmMatch) {
    // Handle both dot and comma as decimal separator
    const kmValue = kmMatch[1].replace(',', '.');
    const meters = Math.round(parseFloat(kmValue) * 1000);
    console.log(`[DEBUG] Extracted from km format: ${kmValue} km = ${meters} m`);
    return meters;
  }
  
  // Look for meter format (e.g. "4 500 m" or "4500m")
  let mMatch = cleanedText.match(/([\d\s]+)\s*m/i);
  if (mMatch) {
    const rawValue = mMatch[1].replace(/\s/g, '');
    const meters = parseInt(rawValue, 10);
    console.log(`[DEBUG] Extracted from meter format: ${rawValue} = ${meters} m`);
    return meters;
  }
  
  // Last attempt - find just the number
  let numMatch = cleanedText.match(/[\d\s.,]+/);
  if (numMatch) {
    const numStr = numMatch[0].replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(numStr);
    // If the number is small, assume it's in km
    if (num < 100) {
      const meters = Math.round(num * 1000);
      console.log(`[DEBUG] Extracted small number as km: ${num} km = ${meters} m`);
      return meters;
    }
    console.log(`[DEBUG] Extracted raw number as meters: ${num} m`);
    return Math.round(num);
  }
  
  console.log(`[DEBUG] Failed to extract course length from text: "${lengthText}"`);
  return 0;
};

/**
 * Extracts course length from event class header
 * Format: "<div class="eventClassHeader"><div><h3>Class name</h3>2 190 m, 8 startande</div></div>"
 */
export const extractCourseInfo = (html: string, className: string): {length: number, participants: number} => {
  // Initialize with default values
  const result = { length: 0, participants: 0 };
  
  try {
    // Check if we're in a browser or server environment
    const isServerSide = typeof window === 'undefined';
    console.log(`[DEBUG] Running in ${isServerSide ? 'server-side' : 'browser'} environment`);
    
    // Create a DOM parser to properly parse the HTML structure
    let doc;
    if (isServerSide) {
      // Server-side parsing via regex for environments without DOM
      console.log(`[DEBUG] Using regex-based parsing for server environment`);
      return extractCourseInfoUsingRegex(html, className);
    } else {
      // Browser-side parsing
      const parser = new DOMParser();
      doc = parser.parseFromString(html, 'text/html');
      
      console.log(`[DEBUG] Looking for class "${className}" in eventClassHeader divs`);
      
      // Find all eventClassHeader divs
      const eventClassHeaders = doc.querySelectorAll('div.eventClassHeader');
      console.log(`[DEBUG] Found ${eventClassHeaders.length} eventClassHeader divs`);
      
      for (let i = 0; i < eventClassHeaders.length; i++) {
        const header = eventClassHeaders[i];
        
        // Find the h3 element inside this header
        const h3 = header.querySelector('h3');
        
        if (h3 && h3.textContent && h3.textContent.trim() === className.trim()) {
          console.log(`[DEBUG] Found exact match for class "${className}" in header ${i+1}`);
          
          // Log the full HTML of the matched header for debugging
          console.log(`[DEBUG] Found eventClassHeader: ${header.outerHTML}`);
          
          // Get the parent div that contains both the h3 and the text node with the length
          const parentDiv = h3.parentElement;
          
          if (parentDiv) {
            // The HTML structure typically looks like:
            // <div><h3>Class Name</h3>3 100 m, 17 startande</div>
            // We need to extract the text node that comes after the h3
            
            // First get the innerHTML of the parent div
            const innerHTML = parentDiv.innerHTML;
            
            // Extract the text after the closing </h3> tag and before the first comma
            const afterH3Match = innerHTML.match(/<\/h3>([^,<]+)/);
            
            if (afterH3Match && afterH3Match[1]) {
              const textAfterH3 = afterH3Match[1].trim();
              console.log(`[DEBUG] Text after </h3>: "${textAfterH3}"`);
              
              // Use the extractCourseLength function to parse the length text
              const lengthValue = extractCourseLength(textAfterH3);
              result.length = lengthValue;
              console.log(`[DEBUG] Extracted course length: ${result.length} m`);
            } else {
              console.log(`[DEBUG] Could not find text after </h3> in: ${innerHTML}`);
            }
            
            // Note: We no longer extract participants count from HTML
            
            return result;
          }
        }
      }
      
      // If no exact match was found, log this and try a more flexible approach
      console.log(`[DEBUG] No exact match found for class "${className}"`);
      
      // Second attempt: Try a more flexible match for the class name
      for (let i = 0; i < eventClassHeaders.length; i++) {
        const header = eventClassHeaders[i];
        const h3 = header.querySelector('h3');
        
        if (h3 && h3.textContent && h3.textContent.includes(className)) {
          console.log(`[DEBUG] Found partial match: "${h3.textContent}" for class "${className}"`);
          
          // Log the full HTML of the matched header for debugging
          console.log(`[DEBUG] Found eventClassHeader with partial match: ${header.outerHTML}`);
          
          const parentDiv = h3.parentElement;
          
          if (parentDiv) {
            const innerHTML = parentDiv.innerHTML;
            const afterH3Match = innerHTML.match(/<\/h3>([^,<]+)/);
            
            if (afterH3Match && afterH3Match[1]) {
              const textAfterH3 = afterH3Match[1].trim();
              console.log(`[DEBUG] Text after </h3> in partial match: "${textAfterH3}"`);
              
              // Use the extractCourseLength function to parse the length text
              const lengthValue = extractCourseLength(textAfterH3);
              result.length = lengthValue;
              console.log(`[DEBUG] Extracted course length from partial match: ${result.length} m`);
            }
            
            // Note: We no longer extract participants count from HTML
            
            return result;
          }
        }
      }
    }
    
    // If no match was found or we're in a server environment, use regex
    console.log(`[DEBUG] Falling back to regex extraction for class "${className}"`);
    return extractCourseInfoUsingRegex(html, className);
    
  } catch (error) {
    console.error(`[ERROR] Exception in extractCourseInfo:`, error);
    
    // Try regex as a last resort after exception
    console.log(`[DEBUG] Exception caught, falling back to regex parser`);
    return extractCourseInfoUsingRegex(html, className);
  }
  
  return result;
};

/**
 * Extract course info using regex patterns, designed to work in both browser and server environments
 */
function extractCourseInfoUsingRegex(html: string, className: string): {length: number, participants: number} {
  const result = { length: 0, participants: 0 };
  console.log(`[DEBUG] Attempting regex-based extraction for class "${className}"`);
  
  try {
    // Escape special regex characters in className
    const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern 1: Look for the exact structure with eventClassHeader
    const classHeaderPattern = new RegExp(
      `<div[^>]*class="eventClassHeader"[^>]*>.*?<h3>\\s*${escapedClassName}\\s*</h3>([^,<]+)`,
      'is'
    );
    
    // Pattern 2: More flexible pattern to find class name and length
    const flexibleClassPattern = new RegExp(
      `<h3>\\s*${escapedClassName}\\s*</h3>([^,<]+)`,
      'is'
    );
    
    // Try the exact pattern first
    const match = classHeaderPattern.exec(html);
    if (match) {
      const lengthText = match[1].trim();
      
      console.log(`[DEBUG] Regex match 1 - Raw length: "${lengthText}"`);
      
      // Extract the context around the match for verification
      const matchStart = Math.max(0, match.index - 50);
      const matchEnd = Math.min(html.length, match.index + match[0].length + 50);
      const context = html.substring(matchStart, matchEnd);
      console.log(`[DEBUG] Regex match context: "${context}"`);
      
      // Extract length
      result.length = extractCourseLength(lengthText);
      
      console.log(`[DEBUG] Extracted through regex pattern 1 - Length: ${result.length} m`);
      return result;
    }
    
    // Try flexible pattern for length
    const lengthMatch = flexibleClassPattern.exec(html);
    if (lengthMatch) {
      const lengthText = lengthMatch[1].trim();
      console.log(`[DEBUG] Regex match 2 - Raw length: "${lengthText}"`);
      
      result.length = extractCourseLength(lengthText);
      console.log(`[DEBUG] Extracted length through regex pattern 2: ${result.length} m`);
      
      return result;
    }
    
    // Last resort: look for any header containing the class name
    const lastResortPattern = new RegExp(`<h[1-6][^>]*>([^<]*${escapedClassName}[^<]*)</h[1-6]>.*?([\\d.,]+\\s*(?:m|km))`, 'is');
    const lastResortMatch = lastResortPattern.exec(html);
    
    if (lastResortMatch) {
      const foundClass = lastResortMatch[1].trim();
      const lengthText = lastResortMatch[2].trim();
      
      console.log(`[DEBUG] Last resort match - Found class: "${foundClass}", Raw length: "${lengthText}"`);
      
      result.length = extractCourseLength(lengthText);
      console.log(`[DEBUG] Extracted length through last resort pattern: ${result.length} m`);
      
      return result;
    }
    
    // If we get here, we couldn't find the class information
    console.log(`[DEBUG] No regex matches found for class "${className}"`);
    
  } catch (error) {
    console.error(`[ERROR] Exception in regex extraction:`, error);
  }
  
  return result;
}

// Export the extract functions
export { extractCourseLength, extractCourseInfo };
