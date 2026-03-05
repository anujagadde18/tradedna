// lib/customSources/applyCustomSources.ts

export type CustomSource = {
  id: string;
  type: "news" | "social" | "technical";
  name: string;
  url: string;
  weight: number;
  enabled: boolean;
};

export function loadCustomSources(): CustomSource[] {
  if (typeof window === "undefined") return [];
  
  try {
    const saved = localStorage.getItem("customSources");
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (error) {
    console.error("Error loading custom sources:", error);
    return [];
  }
}

export function getCustomSourceCount(): number {
  return loadCustomSources().filter(s => s.enabled).length;
}

export function hasCustomSources(): boolean {
  return getCustomSourceCount() > 0;
}

export function getCustomSourceSummary(): {
  total: number;
  byType: Record<"news" | "social" | "technical", number>;
  topSources: CustomSource[];
} {
  const sources = loadCustomSources().filter(s => s.enabled);
  
  return {
    total: sources.length,
    byType: {
      news: sources.filter(s => s.type === "news").length,
      social: sources.filter(s => s.type === "social").length,
      technical: sources.filter(s => s.type === "technical").length
    },
    topSources: sources
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
  };
}
