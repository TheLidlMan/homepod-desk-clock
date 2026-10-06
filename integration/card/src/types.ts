export type Hass = {
  states: Record<
    string,
    { state: string; attributes?: Record<string, unknown> }
  >;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
};

export type Style = {
  background?: string;
  foreground?: string;
  accent?: string;
  radius?: "none" | "small" | "medium" | "large";
  fontFamily?: "default" | "font1" | "font2";
  fontSize?: "auto" | "small" | "medium" | "large" | "xlarge";
  textFlow?: "default" | "overflow" | "wrap";
  marquee?: boolean;
  marqueeIntervalMs?: number;
  marqueeStepPixels?: number;
  marqueeEffect?: "bounce" | "loop";
  horizontalAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  textEffect?: "none" | "shadow" | "outline";
  effectColor?: string;
  effectThickness?: number;
  effectOffsetX?: number;
  effectOffsetY?: number;
};

export type PageTransition = {
  type:
    | "none"
    | "random"
    | "slide"
    | "bounce"
    | "fade"
    | "wipe"
    | "dissolve"
    | "curtain"
    | "blinds"
    | "mosaic"
    | "cascade"
    | "spiral";
  direction?: "left" | "right" | "up" | "down" | "random";
  speed?: "slow" | "normal" | "fast";
  intensity?: "subtle" | "strong";
  tileSize?: "small" | "medium" | "large";
};

export type VisibilityRuleOperator =
  | "range"
  | "number_equals"
  | "number_not_equals"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "contains"
  | "available"
  | "unavailable";
export type VisibilityRule = {
  id: string;
  source: "card" | "entity";
  entity?: string;
  operator: VisibilityRuleOperator;
  minimum?: number;
  maximum?: number;
  value?: number;
  match?: string;
};
export type VisibilityRuleExpression = {
  type: "rule";
  ruleId: string;
  negate?: boolean;
};
export type VisibilityGroupExpression = {
  type: "group";
  operator: "and" | "or";
  children: VisibilityExpression[];
  negate?: boolean;
};
export type VisibilityExpression =
  VisibilityRuleExpression | VisibilityGroupExpression;
export type Visibility = {
  rules: VisibilityRule[];
  expression: VisibilityGroupExpression;
};
export type NumberValueMapping = {
  minimum?: number;
  maximum?: number;
  value: string;
};
export type TextValueMapping = {
  operator: "equals" | "starts_with" | "ends_with" | "contains";
  match: string;
  value: string;
};
export type NumberColorMapping = {
  minimum?: number;
  maximum?: number;
  background?: string;
  foreground?: string;
};
export type TextColorMapping = {
  operator: "equals" | "starts_with" | "ends_with" | "contains";
  match: string;
  background?: string;
  foreground?: string;
};

export type WeatherSettings = {
  period?: "current" | "daily" | "hourly" | "twice_daily";
  offset?: number;
  count?: number;
  step?: number;
  layout?: "vertical" | "horizontal" | "compact";
  iconStyle?: "color" | "mono";
  language?: "en" | "pl";
  fields?: string[];
};

export type NumberValueTransform = {
  precision?: number;
  multiply?: number;
  add?: number;
  absolute?: boolean;
  minimum?: number;
  maximum?: number;
};

export type DisplayCard = {
  type: "clock" | "number" | "status" | "text" | "image" | "chart" | "weather";
  weather?: WeatherSettings;
  frame?: { x: number; y: number; width: number; height: number };
  titleFrame?: { x: number; y: number; width: number; height: number };
  valueFrame?: { x: number; y: number; width: number; height: number };
  graph?: Graph;
  title?: string;
  showTitle?: boolean;
  source?: string;
  text?: string;
  unit?: string;
  minimum?: number;
  maximum?: number;
  progress?: "none" | "bar" | "ring";
  format?: "24h" | "12h";
  showSeconds?: boolean;
  showDate?: boolean;
  onText?: string;
  offText?: string;
  style?: Style;
  titleStyle?: Style;
  valueStyle?: Style;
  visibility?: Visibility;
  valueMappings?: NumberValueMapping[] | TextValueMapping[];
  colorMappings?: NumberColorMapping[] | TextColorMapping[];
  valueTransform?: NumberValueTransform;
  image?: string;
  imageFit?: "cover" | "contain" | "stretch";
  backgroundImage?: string;
  transparentBackground?: boolean;
  backgroundMode?: "color" | "transparent" | "image";
};

export type DisplayRow = {
  title?: string;
  showTitle?: boolean;
  titleStyle?: Style;
  weight?: number;
  gap?: "none" | "small" | "medium";
  cards: DisplayCard[];
  visibility?: Visibility;
};
export type DisplayPage = {
  layout?: "rows" | "free";
  id: string;
  title?: string;
  showTitle?: boolean;
  titlePosition?: "top" | "right" | "bottom" | "left";
  titleStyle?: Style;
  style?: Style;
  backgroundImage?: string;
  transparentCards?: boolean;
  durationSeconds?: number;
  enabled?: boolean;
  visibility?: Visibility;
  transition?: PageTransition;
  rows: DisplayRow[];
};
export type Dashboard = {
  version: 1;
  defaults?: Record<string, unknown>;
  pages: DisplayPage[];
};
export type Display = {
  config_entry_id: string;
  title: string;
  available: boolean;
  active_scene_id: string | null;
  active_scene_name: string | null;
  preview_scene_id: string | null;
  width: number;
  height: number;
  default_font: "builtin" | "font1" | "font2";
  refresh_rate_hz?: number;
  fonts: { id: "font1" | "font2"; installed: boolean; name: string }[];
};
export type Scene = { id: string; name: string; is_default: boolean };
export type ImageAsset = {
  id: string;
  name: string;
  width: number;
  height: number;
  bytes: number;
  preview: string;
  animated?: boolean;
  frameCount?: number;
  durationMs?: number;
  used_by?: string[];
};

export const newCard = (type: DisplayCard["type"] = "number"): DisplayCard => {
  if (type === "weather") return {type, source: "", weather: {period: "current", fields: ["icon", "condition", "temperature"], layout: "vertical"}};
  if (type === "chart") return { type, source: "", graph: newGraph() };
  if (type === "clock") return { type, format: "24h", showDate: true };
  if (type === "image")
    return { type, image: "", imageFit: "cover", showTitle: false };
  if (type === "text") return { type, text: "Text" };
  if (type === "status")
    return { type, source: "", onText: "On", offText: "Off" };
  return { type, source: "", progress: "none" };
};

export type Graph = {
  scale?: "zero" | "fit";
  scalePadding?: number;
  source?: string;
  type?: "bar" | "line";
  points?: number;
  intervalSeconds?: number;
  aggregation?: "mean" | "min" | "max" | "last";
  color?: string;
  opacity?: number;
  lineWidth?: number;
  fillOpacity?: number;
  showPoints?: boolean;
  pointSize?: number;
  barGap?: number;
  gridLines?: number;
  gridColor?: string;
  gridOpacity?: number;
  showValues?: boolean;
  labelEvery?: number;
  decimals?: number;
  minimum?: number;
  maximum?: number;
};
export const newGraph = (): Graph => ({ type: "bar", points: 48, intervalSeconds: 300, aggregation: "mean", color: "accent", opacity: 50, labelEvery: 6, decimals: 1 });
export const newRow = (): DisplayRow => ({
  weight: 1,
  gap: "small",
  cards: [newCard("clock")],
});
export const newPage = (number: number): DisplayPage => ({
  id: `page_${number}`,
  title: `Page ${number}`,
  durationSeconds: 10,
  enabled: true,
  transition: { type: "none" },
  rows: [newRow()],
});
export const newDashboard = (): Dashboard => ({
  version: 1,
  defaults: { pageDurationSeconds: 10, theme: "dark" },
  pages: [newPage(1)],
});

export const mapCardValue = (
  card: DisplayCard,
  raw: string,
): { value: string; mapped: boolean } => {
  if (card.type === "number") {
    const number = transformCardNumber(card, raw);
    if (Number.isFinite(number)) {
      for (const mapping of (card.valueMappings ??
        []) as NumberValueMapping[]) {
        if (
          (mapping.minimum === undefined || number >= mapping.minimum) &&
          (mapping.maximum === undefined || number <= mapping.maximum)
        ) {
          return { value: mapping.value, mapped: true };
        }
      }
      return { value: formatCardNumber(card, number), mapped: false };
    }
  }
  if (card.type === "text") {
    for (const mapping of (card.valueMappings ?? []) as TextValueMapping[]) {
      const matches =
        mapping.operator === "equals"
          ? raw === mapping.match
          : mapping.operator === "starts_with"
            ? raw.startsWith(mapping.match)
            : mapping.operator === "ends_with"
              ? raw.endsWith(mapping.match)
              : raw.includes(mapping.match);
      if (matches) return { value: mapping.value, mapped: true };
    }
  }
  return { value: raw, mapped: false };
};

export const mapCardColors = (
  card: DisplayCard,
  raw: string,
): NumberColorMapping | TextColorMapping | undefined => {
  if (card.type === "number") {
    const number = transformCardNumber(card, raw);
    if (Number.isFinite(number)) {
      return ((card.colorMappings ?? []) as NumberColorMapping[]).find(
        (mapping) =>
          (mapping.minimum === undefined || number >= mapping.minimum) &&
          (mapping.maximum === undefined || number <= mapping.maximum),
      );
    }
  }
  if (card.type === "text") {
    return ((card.colorMappings ?? []) as TextColorMapping[]).find((mapping) =>
      mapping.operator === "equals"
        ? raw === mapping.match
        : mapping.operator === "starts_with"
          ? raw.startsWith(mapping.match)
          : mapping.operator === "ends_with"
            ? raw.endsWith(mapping.match)
            : raw.includes(mapping.match),
    );
  }
  return undefined;
};

export const transformCardNumber = (card: DisplayCard, raw: string) => {
  let value = Number(raw);
  if (!Number.isFinite(value)) return Number.NaN;
  const transform = card.valueTransform;
  if (!transform) return value;
  value = value * (transform.multiply ?? 1) + (transform.add ?? 0);
  if (transform.absolute) value = Math.abs(value);
  if (transform.minimum !== undefined)
    value = Math.max(transform.minimum, value);
  if (transform.maximum !== undefined)
    value = Math.min(transform.maximum, value);
  return value;
};

export const formatCardNumber = (card: DisplayCard, value: number) => {
  const precision = card.valueTransform?.precision;
  if (precision !== undefined) return value.toFixed(precision);
  if (!card.valueTransform) return String(value);
  return Number(value.toFixed(4)).toString();
};
