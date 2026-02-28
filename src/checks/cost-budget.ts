import { CostBudgetResult } from './types';

export interface CostBudgetInput {
  /** Actual cost — can be token count or dollar amount. */
  actual: number;
  /** Budget threshold — same unit as actual. */
  budget: number;
}

/**
 * Checks that token count or dollar cost stays under a threshold.
 */
export function costBudget(input: CostBudgetInput): CostBudgetResult {
  const passed = input.actual <= input.budget;

  return {
    key: 'cost_budget',
    passed,
    details: passed
      ? `${input.actual} within budget of ${input.budget}`
      : `${input.actual} exceeded budget of ${input.budget}`,
    actual: input.actual,
    budget: input.budget,
  };
}

/**
 * Factory: creates a reusable costBudget evaluator with a fixed budget.
 */
export function createCostBudgetEvaluator(config: { budget: number }) {
  return (input: { actual: number }): CostBudgetResult =>
    costBudget({ actual: input.actual, budget: config.budget });
}
