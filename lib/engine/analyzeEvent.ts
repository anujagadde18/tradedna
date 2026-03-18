// lib/engine/analyzeEvent.ts
export type ComponentKey = "social" | "news" | "technical";

export type Contribution = {
  reason: string;
  impact: number; // +/- points
  tag?: string;   // keyword/category trigger
};

export type ComponentBreakdown = {
  key: ComponentKey;
  label: string;
  base: number;
  contributions: Contribution[];
  final: number; // 0..100
};

export type DivergenceWarning = {
  level: "info" | "warning" | "critical";
  title: string;
  detail: string;
  metrics?: Record<string, number>;
};

export type DirectionalOutput = {
  yes: number; // 0..100
  no: number;  // 0..100
  convictionTier: "High" | "Moderate" | "Uncertain" | "Weak";
  strengthLabel: "Strong" | "Moderate" | "Weak";
  stabilityLabel: "High" | "Medium" | "Low";
  volatilityLabel: "Low" | "Moderate" | "High";
};

export type AnalysisOutput = {
  event: string;
  category: {
    name:
      | "crypto"
      | "politics"
      | "regulation"
      | "sports"
      | "entertainment"
      | "tech"
      | "finance"
      | "general";
    confidence: number; // 0..100
    matched: string[];
  };
  components: Record<ComponentKey, ComponentBreakdown>;
  overall: number; // 0..100 (weighted)
  weights: Record<ComponentKey, number>; // sums to 100
  stats: {
    mean: number;
    stdDev: number;
    variance: number;
    stability: number;  // 0..100 (derived from stdDev)
    volatility: number; // 0..100 (derived from category + stdDev)
    divergence: number; // spread max-min
  };
  warnings: DivergenceWarning[];
  directional: DirectionalOutput;
  explanation: string;
};

type CategoryProfile = {
  name: AnalysisOutput["category"]["name"];
  keywords: string[];
  baseBias: Partial<Record<ComponentKey, number>>; // points to add
  volatilityBase: number; // 0..1
};

const CATEGORY_PROFILES: CategoryProfile[] = [
  {
    name: "crypto",
    keywords: ["bitcoin", "btc", "eth", "ethereum", "sol", "solana", "crypto", "altcoin", "token"],
    baseBias: { technical: +10, social: +6, news: +3 },
    volatilityBase: 0.55,
  },
  {
    name: "politics",
    keywords: ["election", "vote", "president", "senate", "congress", "policy", "campaign", "polls"],
    baseBias: { news: +10, social: +5, technical: -3 },
    volatilityBase: 0.50,
  },
  {
    name: "regulation",
    keywords: ["sec", "lawsuit", "ban", "regulation", "bill", "court", "ruling", "fine", "compliance"],
    baseBias: { news: +12, social: +2, technical: -2 },
    volatilityBase: 0.60,
  },
  {
    name: "sports",
    keywords: ["win", "match", "final", "season", "playoffs", "league", "team", "draft", "championship"],
    baseBias: { news: +6, social: +6, technical: -5 },
    volatilityBase: 0.45,
  },
  {
    name: "entertainment",
    keywords: ["movie", "album", "box office", "netflix", "award", "oscar", "grammy", "celebrity"],
    baseBias: { social: +10, news: +4, technical: -6 },
    volatilityBase: 0.40,
  },
  {
    name: "tech",
    keywords: ["ai", "openai", "iphone", "apple", "tesla", "nvidia", "launch", "product", "chip"],
    baseBias: { news: +7, technical: +4, social: +3 },
    volatilityBase: 0.48,
  },
  {
    name: "finance",
    keywords: ["stock", "earnings", "revenue", "guidance", "interest rate", "fed", "inflation", "bond", "market"],
    baseBias: { news: +8, technical: +5, social: +2 },
    volatilityBase: 0.50,
  },
];

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

const round = (n: number) => Math.round(n);

function normalizeWeights(weights: Record<ComponentKey, number>) {
  const sum = weights.social + weights.news + weights.technical;
  if (sum === 100) return weights;
  // normalize to 100
  return {
    social: round((weights.social / sum) * 100),
    news: round((weights.news / sum) * 100),
    technical: 100 - round((weights.social / sum) * 100) - round((weights.news / sum) * 100),
  };
}

function detectCategory(event: string) {
  const text = event.toLowerCase();
  let best: { profile: CategoryProfile; score: number; matched: string[] } | null = null;

  for (const profile of CATEGORY_PROFILES) {
    const matched = profile.keywords.filter((k) => text.includes(k));
    const score = matched.length;
    if (!best || score > best.score) best = { profile, score, matched };
  }

  if (!best || best.score === 0) {
    return { name: "general" as const, confidence: 40, matched: [] as string[], profile: null as CategoryProfile | null };
  }

  // confidence: more matches = higher confidence
  const confidence = clamp(50 + best.score * 12, 0, 100);
  return { name: best.profile.name, confidence, matched: best.matched, profile: best.profile };
}

function keywordContributions(event: string) {
  const text = event.toLowerCase();

  // These are "micro-signals" we can justify in a grant pitch.
  // Each adds contributions across components.
  const rules: Array<{
    tag: string;
    match: (t: string) => boolean;
    impacts: Partial<Record<ComponentKey, number>>;
    reason: string;
  }> = [
    {
      tag: "prediction_question",
      match: (t) => t.includes("?") || t.includes("will ") || t.includes("chance") || t.includes("odds"),
      impacts: { news: +3, social: +2 },
      reason: "Prediction-style question increases narrative/social attention",
    },
    {
      tag: "time_horizon_long",
      match: (t) => t.includes("2026") || t.includes("2027") || t.includes("this year") || t.includes("next year"),
      impacts: { technical: +2, news: +1 },
      reason: "Longer horizon favors trend + macro context signals",
    },
    {
      tag: "price_level",
      match: (t) => t.includes("$") || t.includes("k") || t.includes("price") || t.includes("cross"),
      impacts: { technical: +6 },
      reason: "Explicit price/threshold framing increases technical relevance",
    },
    {
      tag: "regulatory",
      match: (t) => ["sec", "lawsuit", "ban", "regulation", "court", "bill"].some((x) => t.includes(x)),
      impacts: { news: +10, technical: -2 },
      reason: "Regulatory catalysts are headline-driven and can override charts",
    },
    {
      tag: "hype_words",
      match: (t) => ["breakout", "moon", "parabolic", "pump", "crash"].some((x) => t.includes(x)),
      impacts: { social: +8, technical: +2 },
      reason: "Hype/virality language strengthens social sentiment signals",
    },
    {
      tag: "company_stock",
      match: (t) => ["stock", "shares", "earnings", "guidance", "market cap"].some((x) => t.includes(x)),
      impacts: { news: +7, technical: +4 },
      reason: "Equities narratives combine headline catalysts with technical levels",
    },
    {
      tag: "binary_outcome",
      match: (t) => ["win", "lose", "approve", "pass", "ban", "ruling"].some((x) => t.includes(x)),
      impacts: { news: +6, social: +3, technical: -2 },
      reason: "Binary outcomes depend more on information flow than trend indicators",
    },
  ];

  const out: Array<{ tag: string; impacts: Partial<Record<ComponentKey, number>>; reason: string }> = [];
  for (const r of rules) {
    if (r.match(text)) out.push({ tag: r.tag, impacts: r.impacts, reason: r.reason });
  }
  return out;
}

function buildComponent(
  key: ComponentKey,
  label: string,
  base: number,
  contributions: Contribution[]
): ComponentBreakdown {
  const final = clamp(base + contributions.reduce((s, c) => s + c.impact, 0));
  return { key, label, base, contributions, final };
}

function computeStats(values: number[], categoryVolBase: number) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // stability: high stdDev => low stability
  // 0 stdDev => 100 stability; stdDev 25 => 0 stability (tunable)
  const stability = clamp(100 - (stdDev / 25) * 100);

  // divergence: max-min (raw spread)
  const divergence = Math.max(...values) - Math.min(...values);

  // volatility combines category baseline + disagreement penalty from stdDev
  // stdDev component adds up to +0.35
  const volatility01 = clamp((categoryVolBase + (stdDev / 25) * 0.35) * 100) / 100;
  const volatility = clamp(volatility01 * 100);

  return { mean, variance, stdDev, stability, divergence, volatility };
}

function stabilityLabel(stability: number): DirectionalOutput["stabilityLabel"] {
  if (stability >= 75) return "High";
  if (stability >= 50) return "Medium";
  return "Low";
}

function volatilityLabel(volatility: number): DirectionalOutput["volatilityLabel"] {
  if (volatility <= 35) return "Low";
  if (volatility <= 65) return "Moderate";
  return "High";
}

function strengthLabel(overall: number): DirectionalOutput["strengthLabel"] {
  if (overall >= 80) return "Strong";
  if (overall >= 60) return "Moderate";
  return "Weak";
}

function convictionTier(overall: number): DirectionalOutput["convictionTier"] {
  if (overall >= 80) return "High";
  if (overall >= 60) return "Moderate";
  if (overall >= 40) return "Uncertain";
  return "Weak";
}

function divergenceWarnings(components: Record<ComponentKey, ComponentBreakdown>, stats: { divergence: number; stability: number }) {
  const vals = {
    social: components.social.final,
    news: components.news.final,
    technical: components.technical.final,
  };

  const warnings: DivergenceWarning[] = [];

  const maxKey = (Object.keys(vals) as ComponentKey[]).reduce((a, b) => (vals[a] > vals[b] ? a : b));
  const minKey = (Object.keys(vals) as ComponentKey[]).reduce((a, b) => (vals[a] < vals[b] ? a : b));

  if (stats.divergence >= 35) {
    warnings.push({
      level: "critical",
      title: "Severe signal divergence",
      detail: `Signals conflict strongly: ${maxKey.toUpperCase()} is high (${vals[maxKey]}%) while ${minKey.toUpperCase()} is low (${vals[minKey]}%). Treat this as high uncertainty.`,
      metrics: { divergence: round(stats.divergence), stability: round(stats.stability) },
    });
  } else if (stats.divergence >= 22) {
    warnings.push({
      level: "warning",
      title: "Signal divergence detected",
      detail: `Notable disagreement between components (spread ${round(stats.divergence)} pts). Validate evidence sources before relying on the overall score.`,
      metrics: { divergence: round(stats.divergence), stability: round(stats.stability) },
    });
  } else {
    warnings.push({
      level: "info",
      title: "Signals broadly aligned",
      detail: `Component spread is low (${round(stats.divergence)} pts). Overall confidence is more reliable than usual.`,
      metrics: { divergence: round(stats.divergence), stability: round(stats.stability) },
    });
  }

  // Extra warning: stability is low even if spread isn't massive (possible mid-range scatter)
  if (stats.stability < 45) {
    warnings.push({
      level: "warning",
      title: "Low stability (high variance)",
      detail: "Component variance is high, which mathematically implies low stability. Expect confidence to swing as new info arrives.",
      metrics: { stability: round(stats.stability) },
    });
  }

  return warnings;
}

function directionalModel(params: {
  event: string;
  categoryName: AnalysisOutput["category"]["name"];
  overall: number;
  components: Record<ComponentKey, ComponentBreakdown>;
  stats: { stability: number; volatility: number; divergence: number };
}) {
  const text = params.event.toLowerCase();

  // Start with overall as base probability (0.0..1.0)
  let pYes = clamp(params.overall) / 100;

  // ---- Asymmetry / skew logic (institutional flavor) ----
  const s = params.components.social.final;
  const n = params.components.news.final;
  const t = params.components.technical.final;

  // If TECH >> NEWS, markets may be "technically primed" but narrative lagging.
  // For crypto, that often skews YES slightly (momentum) but increases volatility penalty later.
  if (t - n >= 20 && t >= 70) pYes += 0.04;

  // If NEWS >> TECH, narrative catalyst might dominate-skew YES slightly.
  if (n - t >= 20 && n >= 70) pYes += 0.03;

  // If SOCIAL >> NEWS, crowd sentiment but weak confirmation-tiny skew, but divergence penalty later.
  if (s - n >= 18 && s >= 70) pYes += 0.015;

  // Question framing: "increase / cross / reach / above" tends to be directional-up bias.
  if (/(increase|cross|reach|above|higher|rise|rally|surge)/.test(text)) pYes += 0.02;

  // Negative framing: "drop / below / crash / decline" means YES may be "down move happens"
  // We don't invert here; we just reduce overly optimistic skew.
  if (/(crash|drop|below|decline|fall|lower)/.test(text)) pYes -= 0.01;

  // Category-specific micro skew
  if (params.categoryName === "regulation") pYes += 0.01; // catalysts can be decisive
  if (params.categoryName === "sports") pYes -= 0.005;    // noisy outcomes

  // Clamp before uncertainty adjustments
  pYes = Math.min(0.92, Math.max(0.08, pYes));

  // ---- Uncertainty / shrink-to-50 adjustment ----
  // volatility and divergence should shrink confidence back toward 0.5
  const vol01 = clamp(params.stats.volatility) / 100;
  const div01 = clamp(params.stats.divergence, 0, 50) / 50; // 0..1
  const stability01 = clamp(params.stats.stability) / 100;

  // Shrink factor: higher volatility + divergence + low stability => stronger shrink
  const shrink =
    0.15 + vol01 * 0.45 + div01 * 0.25 + (1 - stability01) * 0.25; // ~0.15..1.1
  const shrinkClamped = Math.min(0.85, Math.max(0.15, shrink));

  pYes = 0.5 + (pYes - 0.5) * (1 - shrinkClamped);

  // Final clamp and mirror
  pYes = Math.min(0.9, Math.max(0.1, pYes));
  const yes = round(pYes * 100);
  const no = 100 - yes;

  return { yes, no };
}

export function analyzeEvent(
  event: string,
  weightsInput: Record<ComponentKey, number> = { social: 40, news: 35, technical: 25 }
): AnalysisOutput {
  const weights = normalizeWeights(weightsInput);
  const cat = detectCategory(event);

  // Base scores: neutral starting point
  const base = 50;

  // Build contributions
  const contributionsByComponent: Record<ComponentKey, Contribution[]> = {
    social: [],
    news: [],
    technical: [],
  };

  // Category bias
  if (cat.profile) {
    for (const key of ["social", "news", "technical"] as ComponentKey[]) {
      const impact = cat.profile.baseBias[key];
      if (impact && impact !== 0) {
        contributionsByComponent[key].push({
          reason: `Category bias: ${cat.profile.name}`,
          impact,
          tag: `category:${cat.profile.name}`,
        });
      }
    }
  }

  // Keyword micro-signals
  for (const rule of keywordContributions(event)) {
    for (const key of ["social", "news", "technical"] as ComponentKey[]) {
      const impact = rule.impacts[key];
      if (impact && impact !== 0) {
        contributionsByComponent[key].push({
          reason: rule.reason,
          impact,
          tag: `rule:${rule.tag}`,
        });
      }
    }
  }

  // Assemble components
  const components: Record<ComponentKey, ComponentBreakdown> = {
    social: buildComponent("social", "Social Score", base, contributionsByComponent.social),
    news: buildComponent("news", "News Score", base, contributionsByComponent.news),
    technical: buildComponent("technical", "Technical Score", base, contributionsByComponent.technical),
  };

  // Weighted overall
  const overall =
    round(
      (components.social.final * weights.social +
        components.news.final * weights.news +
        components.technical.final * weights.technical) /
        100
    );

  const values = [components.social.final, components.news.final, components.technical.final];
  const stats = computeStats(values, cat.profile?.volatilityBase ?? 0.45);

  const warnings = divergenceWarnings(components, stats);

  const dir = directionalModel({
    event,
    categoryName: cat.name,
    overall,
    components,
    stats,
  });

  const directional: DirectionalOutput = {
    yes: dir.yes,
    no: dir.no,
    convictionTier: convictionTier(overall),
    strengthLabel: strengthLabel(overall),
    stabilityLabel: stabilityLabel(stats.stability),
    volatilityLabel: volatilityLabel(stats.volatility),
  };

  // Generate beginner-friendly explanation
  const strongestComponent = Object.entries(components)
    .map(([key, comp]) => ({ key, score: comp.final }))
    .sort((a, b) => b.score - a.score)[0];
  
  const componentNames = {
    social: "community buzz",
    news: "news headlines",
    technical: "market data"
  };

  const explanation = [
    `This is a ${cat.name} event.`,
    `Our prediction is ${directional.yes > 50 ? "YES" : "NO"} with ${directional.yes > 50 ? directional.yes : directional.no}% confidence.`,
    `${componentNames[strongestComponent.key as ComponentKey]} is the strongest signal (${strongestComponent.score} points).`,
    directional.stabilityLabel === "High" 
      ? "All signals agree with each other, giving us high trust in this prediction."
      : directional.stabilityLabel === "Medium"
      ? "Signals mostly agree with each other, giving us moderate trust."
      : "Signals are mixed and don't fully agree, so trust this prediction carefully.",
  ].join(" ");

  return {
    event,
    category: { name: cat.name, confidence: cat.confidence, matched: cat.matched },
    components,
    overall,
    weights,
    stats: {
      mean: round(stats.mean),
      stdDev: Number(stats.stdDev.toFixed(2)),
      variance: Number(stats.variance.toFixed(2)),
      stability: round(stats.stability),
      volatility: round(stats.volatility),
      divergence: round(stats.divergence),
    },
    warnings,
    directional,
    explanation,
  };
}
