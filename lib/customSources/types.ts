// lib/customSources/types.ts

export type SourceType = "news" | "social" | "technical";

export interface CustomSource {
  id: string;
  type: SourceType;
  name: string;
  url: string;
  weight: number;
  enabled: boolean;
  isDefault?: boolean;
  description?: string;
}

export interface CuratedSource {
  name: string;
  url: string;
  description: string;
  type: SourceType;
}

export interface SourceWeights {
  news: CustomSource[];
  social: CustomSource[];
  technical: CustomSource[];
}

export interface CategoryWeight {
  news: number;
  social: number;
  technical: number;
}

export interface CalculatedWeight {
  source: CustomSource;
  categoryWeight: number;
  sourceWeight: number;
  finalWeight: number;
}
