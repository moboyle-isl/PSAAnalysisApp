'use server';

import {
  predictRemainingLife as predictRemainingLifeFlow,
  type PredictRemainingLifeInput,
  type PredictRemainingLifeOutput,
} from '@/ai/flows/predict-remaining-life';
import {
  recommendRepairs as recommendRepairsFlow,
  type RecommendRepairsInput,
  type RecommendRepairsOutput,
} from '@/ai/flows/recommend-repairs';

export async function predictRemainingLife(
  data: PredictRemainingLifeInput
): Promise<PredictRemainingLifeOutput> {
  try {
    const result = await predictRemainingLifeFlow(data);
    return result;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to predict remaining life.');
  }
}

export async function recommendRepairs(
  data: RecommendRepairsInput
): Promise<RecommendRepairsOutput> {
  try {
    const result = await recommendRepairsFlow(data);
    return result;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to recommend repairs.');
  }
}
