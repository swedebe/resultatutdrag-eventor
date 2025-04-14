
/**
 * Utilities for handling time conversions
 */

/**
 * Converts time in format "MM:SS" or "HH:MM:SS" to seconds
 */
export const timeToSeconds = (timeString: string): number => {
  if (!timeString) return 0;
  
  const parts = timeString.split(':').map(Number);
  
  if (parts.length === 3) {
    // Format: HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // Format: MM:SS
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
};
