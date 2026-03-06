// lib/customSources/sourceManager.ts

import { CustomSource, SourceType } from "./types";
import { DEFAULT_SOURCES } from "./curatedSources";
import { autoBalanceWeights, normalizeWeights } from "./weightCalculator";

const STORAGE_KEY = "playpicks_custom_sources";

/**
 * Load all sources from localStorage
 */
export function loadSources(): CustomSource[] {
  if (typeof window === "undefined") return DEFAULT_SOURCES;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SOURCES;
    
    const parsed = JSON.parse(saved);
    
    // Merge with defaults (in case defaults changed)
    const defaultIds = DEFAULT_SOURCES.map(d => d.id);
    const customSources = parsed.filter((s: CustomSource) => !defaultIds.includes(s.id));
    
    return [...DEFAULT_SOURCES, ...customSources];
  } catch (error) {
    console.error("Error loading sources:", error);
    return DEFAULT_SOURCES;
  }
}

/**
 * Save sources to localStorage
 */
export function saveSources(sources: CustomSource[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch (error) {
    console.error("Error saving sources:", error);
  }
}

/**
 * Add a new source
 */
export function addSource(
  sources: CustomSource[],
  newSource: Omit<CustomSource, "id" | "weight" | "enabled">
): CustomSource[] {
  const source: CustomSource = {
    ...newSource,
    id: `custom-${Date.now()}`,
    weight: 0,
    enabled: true
  };
  
  const updated = [...sources, source];
  
  // Auto-balance weights within the category
  const categorySources = updated.filter(s => s.type === newSource.type);
  const balanced = autoBalanceWeights(categorySources);
  
  // Merge back
  const result = updated.map(s => {
    const balancedSource = balanced.find(b => b.id === s.id);
    return balancedSource || s;
  });
  
  saveSources(result);
  return result;
}

/**
 * Remove a source (except defaults)
 */
export function removeSource(sources: CustomSource[], sourceId: string): CustomSource[] {
  const source = sources.find(s => s.id === sourceId);
  
  // Can't remove default sources
  if (source?.isDefault) {
    console.warn("Cannot remove default source");
    return sources;
  }
  
  const updated = sources.filter(s => s.id !== sourceId);
  
  // Re-balance remaining sources in that category
  if (source) {
    const categorySources = updated.filter(s => s.type === source.type);
    const balanced = autoBalanceWeights(categorySources);
    
    const result = updated.map(s => {
      const balancedSource = balanced.find(b => b.id === s.id);
      return balancedSource || s;
    });
    
    saveSources(result);
    return result;
  }
  
  saveSources(updated);
  return updated;
}

/**
 * Toggle source enabled state
 */
export function toggleSource(sources: CustomSource[], sourceId: string): CustomSource[] {
  const updated = sources.map(s =>
    s.id === sourceId ? { ...s, enabled: !s.enabled } : s
  );
  
  const source = sources.find(s => s.id === sourceId);
  if (source) {
    const categorySources = updated.filter(s => s.type === source.type);
    const balanced = autoBalanceWeights(categorySources);
    
    const result = updated.map(s => {
      const balancedSource = balanced.find(b => b.id === s.id);
      return balancedSource || s;
    });
    
    saveSources(result);
    return result;
  }
  
  saveSources(updated);
  return updated;
}

/**
 * Update source weight
 */
export function updateSourceWeight(
  sources: CustomSource[],
  sourceId: string,
  newWeight: number
): CustomSource[] {
  const source = sources.find(s => s.id === sourceId);
  if (!source) return sources;
  
  const updated = sources.map(s =>
    s.id === sourceId ? { ...s, weight: newWeight } : s
  );
  
  // Normalize weights within category
  const categorySource = updated.filter(s => s.type === source.type);
  const normalized = normalizeWeights(categorySource);
  
  const result = updated.map(s => {
    const normalizedSource = normalized.find(n => n.id === s.id);
    return normalizedSource || s;
  });
  
  saveSources(result);
  return result;
}

/**
 * Get sources by type
 */
export function getSourcesByType(sources: CustomSource[], type: SourceType): CustomSource[] {
  return sources.filter(s => s.type === type);
}

/**
 * Get enabled sources
 */
export function getEnabledSources(sources: CustomSource[]): CustomSource[] {
  return sources.filter(s => s.enabled);
}

/**
 * Get custom (non-default) sources
 */
export function getCustomSources(sources: CustomSource[]): CustomSource[] {
  return sources.filter(s => !s.isDefault);
}

/**
 * Check if a source already exists
 */
export function sourceExists(sources: CustomSource[], url: string, type: SourceType): boolean {
  return sources.some(s => s.url === url && s.type === type);
}
