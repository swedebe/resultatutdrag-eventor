
/**
 * Shared result types used across the application
 */

export type ResultRow = {
  name: string;
  class: string;
  classType: string;
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
  eventType?: string;       
  personId?: string | number;
  birthYear?: string | number;
  started?: any; // Allow any type to preserve the original value exactly (could be 0, 1, string, empty, etc.)
  antalStartande?: string;
  [key: string]: any;
};
