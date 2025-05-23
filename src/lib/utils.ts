
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Truncates a URL in a smart way to preserve important parts like IDs
 * @param url The URL to truncate
 * @param maxLength Maximum length before truncation (default 100)
 * @returns Truncated URL string
 */
export function truncateUrl(url: string, maxLength: number = 100): string {
  if (!url || url.length <= maxLength) {
    return url;
  }
  
  // Try to find important ID parameters
  const eventIdMatch = url.match(/eventId=(\d+)/);
  const classIdMatch = url.match(/classId=(\d+)/);
  
  if (eventIdMatch || classIdMatch) {
    // For URLs with IDs, ensure the ID is fully included
    const lastIdIndex = Math.max(
      eventIdMatch ? url.indexOf(eventIdMatch[0]) + eventIdMatch[0].length : 0,
      classIdMatch ? url.indexOf(classIdMatch[0]) + classIdMatch[0].length : 0
    );
    
    // Only truncate if we can preserve the IDs and the URL is significantly long
    if (lastIdIndex > 0 && url.length > lastIdIndex + 20) {
      return url.substring(0, Math.min(lastIdIndex + 10, maxLength)) + '...';
    }
  }
  
  // Default truncation for other URLs
  return url.substring(0, maxLength) + '...';
}
