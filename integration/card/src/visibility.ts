import type { DisplayCard, Hass, Visibility, VisibilityExpression, VisibilityRule } from "./types";

const unavailableStates = new Set(["unknown", "unavailable"]);
const numericOperators = new Set([
  "range", "number_equals", "number_not_equals", "greater_than",
  "greater_than_or_equal", "less_than", "less_than_or_equal",
]);

function ruleMatches(hass: Hass | undefined, rule: VisibilityRule, card?: DisplayCard): boolean {
  const state = rule.source === "card"
    ? card?.source ? hass?.states[card.source]?.state : card?.type === "text" ? card.text : undefined
    : rule.entity ? hass?.states[rule.entity]?.state : undefined;
  const available = state !== undefined && !unavailableStates.has(state);
  if (rule.operator === "available") return available;
  if (rule.operator === "unavailable") return !available;
  if (!available) return false;
  if (numericOperators.has(rule.operator)) {
    const number = Number(state);
    if (!Number.isFinite(number)) return false;
    if (rule.operator === "range") return (rule.minimum === undefined || number >= rule.minimum)
      && (rule.maximum === undefined || number <= rule.maximum);
    const expected = rule.value;
    if (!Number.isFinite(expected)) return false;
    if (rule.operator === "number_equals") return number === expected;
    if (rule.operator === "number_not_equals") return number !== expected;
    if (rule.operator === "greater_than") return number > expected!;
    if (rule.operator === "greater_than_or_equal") return number >= expected!;
    if (rule.operator === "less_than") return number < expected!;
    return number <= expected!;
  }
  const match = rule.match ?? "";
  if (rule.operator === "equals") return state === match;
  if (rule.operator === "not_equals") return state !== match;
  if (rule.operator === "starts_with") return state.startsWith(match);
  if (rule.operator === "ends_with") return state.endsWith(match);
  return state.includes(match);
}

export function visibilityMatches(hass: Hass | undefined, visibility: Visibility | undefined, card?: DisplayCard): boolean {
  if (!visibility) return true;
  const rules = new Map(visibility.rules.map((rule) => [rule.id, rule]));
  const evaluate = (expression: VisibilityExpression): boolean => {
    const result = expression.type === "rule"
      ? ruleMatches(hass, rules.get(expression.ruleId)!, card)
      : expression.operator === "and" ? expression.children.every(evaluate) : expression.children.some(evaluate);
    return expression.negate ? !result : result;
  };
  return evaluate(visibility.expression);
}
