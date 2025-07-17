// predict-remaining-life.ts
'use server';

/**
 * @fileOverview Predicts the remaining life of an asset based on its condition score.
 *
 * - predictRemainingLife - A function that predicts the remaining life of an asset.
 * - PredictRemainingLifeInput - The input type for the predictRemainingLife function.
 * - PredictRemainingLifeOutput - The return type for the predictRemainingLife function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictRemainingLifeInputSchema = z.object({
  conditionScore: z
    .number()
    .describe('The overall condition score of the asset (e.g., 1-100).'),
  assetType: z.string().describe('The type of asset (e.g., pump, valve, pipe).'),
  maintenanceHistory: z
    .string()
    .optional()
    .describe('A description of the maintenance history of the asset.'),
  usageIntensity: z
    .string()
    .optional()
    .describe('A description of the usage intensity of the asset (e.g., light, moderate, heavy).'),
});
export type PredictRemainingLifeInput = z.infer<
  typeof PredictRemainingLifeInputSchema
>;

const PredictRemainingLifeOutputSchema = z.object({
  estimatedRemainingLife: z
    .string()
    .describe(
      'An estimate of the remaining life of the asset, including units (e.g., 5 years, 10 months).'
    ),
  confidenceLevel: z
    .string()
    .describe(
      'A qualitative assessment of the confidence level of the prediction (e.g., high, medium, low).'
    ),
  rationale: z
    .string()
    .describe(
      'The rationale behind the remaining life estimate, including factors considered.'
    ),
});
export type PredictRemainingLifeOutput = z.infer<
  typeof PredictRemainingLifeOutputSchema
>;

export async function predictRemainingLife(
  input: PredictRemainingLifeInput
): Promise<PredictRemainingLifeOutput> {
  return predictRemainingLifeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictRemainingLifePrompt',
  input: {schema: PredictRemainingLifeInputSchema},
  output: {schema: PredictRemainingLifeOutputSchema},
  prompt: `You are an expert in asset management and reliability engineering.

You are provided with the condition score, asset type, maintenance history, and usage intensity of an asset.

Based on this information, estimate the remaining life of the asset, a confidence level in the estimate, and the rationale behind the estimate.

Condition Score: {{{conditionScore}}}
Asset Type: {{{assetType}}}
Maintenance History: {{{maintenanceHistory}}}
Usage Intensity: {{{usageIntensity}}}

Provide a response that is easily understood by a non-technical user.

Ensure that the units are included in the remaining life. For example, '5 years' instead of '5'.

Format the output according to the schema.

Consider maintenance history and usage intensity when available.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const predictRemainingLifeFlow = ai.defineFlow(
  {
    name: 'predictRemainingLifeFlow',
    inputSchema: PredictRemainingLifeInputSchema,
    outputSchema: PredictRemainingLifeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
