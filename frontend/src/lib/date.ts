/**
 * @file date.ts
 * @description Date formatting utilities for the Spurly client.
 * Provides consistent formatting of timestamps in conversation bubbles and history listings.
 */

/**
 * Formats an ISO date string into a user-friendly format (e.g., "Jun 26, 01:00 PM").
 * Falls back to "Chat Session" if date parsing fails.
 * 
 * @param isoString - ISO string to format
 */
export const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Chat Session';
  }
};
