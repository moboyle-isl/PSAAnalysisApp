'use server';

import {
  predictRemainingLife as predictRemainingLifeFlow,
  type PredictRemainingLifeInput,
  type PredictRemainingLifeOutput,
} from '@/ai/flows/predict-remaining-life';
import {
  recommendRepairsForAllAssets as recommendRepairsForAllAssetsFlow,
  type RecommendRepairsAllAssetsInput,
  type RecommendRepairsAllAssetsOutput,
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

export async function recommendRepairsForAllAssets(
  data: RecommendRepairsAllAssetsInput
): Promise<RecommendRepairsAllAssetsOutput> {
  try {
    const result = await recommendRepairsForAllAssetsFlow(data);
    return result;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to recommend repairs.');
  }
}
