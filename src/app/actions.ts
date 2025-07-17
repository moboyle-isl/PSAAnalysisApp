
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
import type { RepairPrice } from '@/lib/data';
import { initialRepairPrices } from '@/lib/data';
import { cookies } from 'next/headers';

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

export async function getRepairPricesFromCookie(): Promise<RepairPrice[]> {
  const cookieStore = cookies();
  const pricesCookie = cookieStore.get('repairPrices');
  if (pricesCookie?.value) {
    try {
      const parsed = JSON.parse(pricesCookie.value);
      // Return the parsed data if it's an array, even if it's empty.
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse repairPrices cookie:', e);
      // Fallback to initial prices if cookie is corrupt.
      return initialRepairPrices;
    }
  }
  // Fallback to initial prices if cookie is not set.
  return initialRepairPrices;
}
