// lib/storage/popularEvents.ts

export type PopularEvent = {
  event: string;
  count: number;
  lastAnalyzed: number;
  category: string;
  avgYesConfidence: number;
};

const STORAGE_KEY = "tradedna_popular_events";
const MAX_EVENTS = 100;

export function trackEventAnalysis(event: string, category: string, yesConfidence: number): void {
  try {
    const events = getPopularEvents();
    
    const existing = events.find(e => e.event.toLowerCase() === event.toLowerCase());
    
    if (existing) {
      existing.count++;
      existing.lastAnalyzed = Date.now();
      // Update rolling average
      existing.avgYesConfidence = Math.round(
        (existing.avgYesConfidence * (existing.count - 1) + yesConfidence) / existing.count
      );
    } else {
      events.push({
        event,
        count: 1,
        lastAnalyzed: Date.now(),
        category,
        avgYesConfidence: yesConfidence,
      });
    }

    // Sort by count (descending) and keep top MAX_EVENTS
    events.sort((a, b) => b.count - a.count);
    if (events.length > MAX_EVENTS) {
      events.splice(MAX_EVENTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error("Failed to track event:", err);
  }
}

export function getPopularEvents(): PopularEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (err) {
    console.error("Failed to load popular events:", err);
    return [];
  }
}

export function getTrendingEvents(limit: number = 5): PopularEvent[] {
  const events = getPopularEvents();
  
  // Filter to events analyzed in last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = events.filter(e => e.lastAnalyzed > weekAgo);
  
  // Sort by count
  recent.sort((a, b) => b.count - a.count);
  
  return recent.slice(0, limit);
}

export function getRecentEvents(limit: number = 5): PopularEvent[] {
  const events = getPopularEvents();
  
  // Sort by most recent
  events.sort((a, b) => b.lastAnalyzed - a.lastAnalyzed);
  
  return events.slice(0, limit);
}

export function clearPopularEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear popular events:", err);
  }
}
