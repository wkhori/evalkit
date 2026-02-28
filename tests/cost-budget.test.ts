import { describe, it, expect } from 'vitest';
import { costBudget, createCostBudgetEvaluator } from '../src/checks/cost-budget';

describe('costBudget', () => {
  it('passes when under budget', () => {
    const result = costBudget({ actual: 500, budget: 1000 });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('cost_budget');
    expect(result.actual).toBe(500);
    expect(result.budget).toBe(1000);
    expect(result.details).toBe('500 within budget of 1000');
  });

  it('fails when over budget', () => {
    const result = costBudget({ actual: 1500, budget: 1000 });
    expect(result.passed).toBe(false);
    expect(result.details).toBe('1500 exceeded budget of 1000');
  });

  it('passes at exact budget (<=)', () => {
    const result = costBudget({ actual: 1000, budget: 1000 });
    expect(result.passed).toBe(true);
  });

  it('works with dollar amounts', () => {
    const result = costBudget({ actual: 0.05, budget: 0.10 });
    expect(result.passed).toBe(true);
  });

  it('works with token counts', () => {
    const result = costBudget({ actual: 50000, budget: 100000 });
    expect(result.passed).toBe(true);
  });
});

describe('createCostBudgetEvaluator', () => {
  it('creates a reusable evaluator with fixed budget', () => {
    const evaluator = createCostBudgetEvaluator({ budget: 1000 });

    expect(evaluator({ actual: 500 }).passed).toBe(true);
    expect(evaluator({ actual: 1500 }).passed).toBe(false);
  });
});
