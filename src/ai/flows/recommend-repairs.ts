
'use server';

/**
 * @fileOverview A repair recommendation AI agent.
 *
 * - recommendRepairsForAllAssets - A function that recommends repairs for a list of assets.
 * - generateCostsForRecommendations - A function that generates costs based on user-verified recommendations.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AssetSchema = z.object({
  assetId: z.string(),
  address: z.string(),
  yearInstalled: z.string(),
  material: z.enum(['Concrete', 'Polyethylene', 'Fibreglass']),
  setbackFromWaterSource: z.string(),
  setbackFromHouse: z.string(),
  tankBuryDepth: z.string(),
  openingSize: z.string(),
  aboveGroundCollarHeight: z.string(),
  systemType: z.enum(['Cistern', 'Septic Tank']),
  assetSubType: z.enum(['Cistern', 'Pump Out', 'Mound', 'Septic Field', 'Other', 'Unknown']),
  siteCondition: z.string(),
  coverCondition: z.string(),
  collarCondition: z.string(),
  interiorCondition: z.string(),
  overallCondition: z.string(),
  abandoned: z.enum(['Yes', 'No']),
  fieldNotes: z.string().optional(),
});

const RepairPriceSchema = z.object({
    id: z.string(),
    repairType: z.string(),
    unitPrice: z.number(),
    description: z.string().optional(),
});

const RecommendRepairsAllAssetsInputSchema = z.object({
    assets: z.array(AssetSchema),
    rules: z.string().describe("A string containing user-defined rules, where each rule is on a new line. Rules can be for repairs or for life expectancy."),
});
export type RecommendRepairsAllAssetsInput = z.infer<typeof RecommendRepairsAllAssetsInputSchema>;


const SingleAssetRecommendationSchema = z.object({
    assetId: z.string(),
    recommendation: z.array(z.string()).describe("A list of recommended repair or replacement actions. Each item should be a short summary. If no action is needed, it must be an array containing the single string 'No action needed'."),
    estimatedRemainingLife: z.string().describe("An estimate of the remaining life of the asset. It MUST be one of the following values: '0-5 years', '5-10 years', '10-15 years', '15-20 years', or '20-25 years'."),
});


const RecommendRepairsAllAssetsOutputSchema = z.object({
    recommendations: z.array(SingleAssetRecommendationSchema),
    errors: z.array(z.object({
        assetId: z.string(),
        message: z.string(),
    })).optional(),
});
export type RecommendRepairsAllAssetsOutput = z.infer<typeof RecommendRepairsAllAssetsOutputSchema>;


const GenerateCostsInputSchema = z.object({
    assets: z.array(z.object({
        assetId: z.string(),
        userRecommendation: z.array(z.string()).describe("The final, user-verified list of repairs for this asset."),
    })),
    repairPrices: z.array(RepairPriceSchema).describe("A list of available repair types and their unit prices."),
});
export type GenerateCostsInput = z.infer<typeof GenerateCostsInputSchema>;

const CostBreakdownItemSchema = z.object({
    repairType: z.string().describe("The specific repair type from the provided price list."),
    unitPrice: z.number().describe("The unit price for this repair type."),
});

const SingleAssetCostSchema = z.object({
    assetId: z.string(),
    recommendedRepairType: z.array(z.string()).describe("A list of specific repair types derived from the user's recommendation. This can be from the provided price list or a new one if appropriate. If no specific repair is applicable, return ['None']."),
    estimatedCost: z.number().describe("The total estimated cost for all recommended repairs. If any recommended repair type is not in the price list, do not include its cost in the total."),
    needsPrice: z.boolean().describe("Set to true if any of the recommended repair types do not have a price in the provided list, otherwise set to false."),
    costBreakdown: z.array(CostBreakdownItemSchema).describe("A detailed list of each repair and its cost that contributed to the total estimatedCost."),
});

const GenerateCostsOutputSchema = z.object({
    costs: z.array(SingleAssetCostSchema),
});
export type GenerateCostsOutput = z.infer<typeof GenerateCostsOutputSchema>;


export async function recommendRepairsForAllAssets(input: RecommendRepairsAllAssetsInput): Promise<RecommendRepairsAllAssetsOutput> {
    return recommendRepairsForAllAssetsFlow(input);
}

export async function generateCostsForRecommendations(input: GenerateCostsInput): Promise<GenerateCostsOutput> {
    return generateCostsFlow(input);
}


const recommendRepairsForAllAssetsPrompt = ai.definePrompt({
  name: 'recommendRepairsForAllAssetsPrompt',
  input: { schema: RecommendRepairsAllAssetsInputSchema },
  output: { schema: RecommendRepairsAllAssetsOutputSchema },
  config: {
    temperature: 0,
  },
  prompt: `You are an AI asset management expert. For each asset in the provided list, you MUST perform two distinct tasks in a specific order:
1.  Estimate the remaining life.
2.  Recommend repairs.

You must provide a response for every asset in the list.

For each asset, follow this logic precisely:
---
**TASK 1: ESTIMATE REMAINING LIFE**
1.  **Check for Rules First:** Examine the provided "User-Defined Rules". If the asset's data matches a rule that defines a "remaining life", you MUST use the life expectancy from that rule. This is the highest priority.
2.  **Analyze if No Rule Applies:** If and only if no life-related rule matches the asset, you must then estimate the remaining life based on its 'Year Installed', all available condition scores, 'Material', and system type.
    - A 'Year Installed' of "Unknown" means it is likely very old.
    - A value of "N/A" for a condition score means the data is unavailable and should be ignored.
    - If a full replacement is recommended in Task 2, the remaining life should generally be '0-5 years', unless a life rule from step 1 specifies otherwise.
3.  **Output Format:** Your final estimate MUST be one of the following 5-year increment options: "0-5 years", "5-10 years", "10-15 years", "15-20 years", or "20-25 years".

---
**TASK 2: RECOMMEND REPAIRS**
1.  **Gather All Recommendations:** You will create a final list of recommendations by combining two sources:
    - **Rule-Based:** Check if the asset's data matches any of the "User-Defined Rules" that specify a "recommendation". Add all matching recommendations to a temporary list.
    - **Analysis-Based:** Independently, analyze the 'Field Notes' and all available condition scores to identify any other problems that require repairs. Add any new findings to the temporary list. A score of "N/A" means the data is not available and should be ignored for that specific score.
2.  **Finalize the List:**
    - Combine the recommendations from both sources. For example, if a rule recommends moving a tank and the field notes mention a broken conduit, you must recommend both repairs.
    - If, after checking both rules and analysis, there are no identified issues, the final 'recommendation' array should contain a single string in the array: "No action needed". Otherwise, it should contain the combined list of required actions.

---
**User-Defined Rules (Used for Tasks 1 & 2):**
{{#if rules}}
{{{rules}}}
{{else}}
No user-defined rules provided.
{{/if}}

---
**Assets to Analyze:**
{{#each assets}}
- Asset ID: {{assetId}}
  - Address: {{address}}
  - Year Installed: {{yearInstalled}}
  - Material: {{material}}
  - Setback Water (m): {{setbackFromWaterSource}}
  - Setback House (m): {{setbackFromHouse}}
  - Bury Depth (m): {{tankBuryDepth}}
  - Opening Size (m): {{openingSize}}
  - Collar Height (m): {{aboveGroundCollarHeight}}
  - System Type: {{systemType}}
  - Sub-Type: {{assetSubType}}
  - Site Condition: {{siteCondition}}
  - Cover Condition: {{coverCondition}}
  - Collar Condition: {{collarCondition}}
  - Interior Condition: {{interiorCondition}}
  - Overall Condition: {{overallCondition}}
  - Abandoned / Not in Use?: {{abandoned}}
  - Field Notes: "{{fieldNotes}}"
---
{{/each}}

Return your answer as a single JSON object with a "recommendations" field containing an array of your findings, one for each asset ID, in the format prescribed by the output schema. Ensure all fields in the output schema are populated for every asset.
`,
});

const recommendRepairsForAllAssetsFlow = ai.defineFlow(
    {
        name: 'recommendRepairsForAllAssetsFlow',
        inputSchema: RecommendRepairsAllAssetsInputSchema,
        outputSchema: RecommendRepairsAllAssetsOutputSchema,
    },
    async (input) => {
        const result = await recommendRepairsForAllAssetsPrompt(input);
        const output = result.output;
        
        if (!output) {
             throw new Error("Received no output from the AI model.");
        }

        // Find which assets are missing from the response
        const receivedAssetIds = new Set(output.recommendations.map(r => r.assetId));
        const missingAssets = input.assets.filter(a => !receivedAssetIds.has(a.assetId));

        const errors = output.errors || [];
        for (const missing of missingAssets) {
            errors.push({
                assetId: missing.assetId,
                message: "The AI model did not return a recommendation for this asset.",
            });
        }

        return {
            recommendations: output.recommendations,
            errors: errors,
        };
    }
);


const generateCostsPrompt = ai.definePrompt({
    name: 'generateCostsPrompt',
    input: { schema: GenerateCostsInputSchema },
    output: { schema: GenerateCostsOutputSchema },
    prompt: `You are an AI assistant that determines specific repair types and calculates costs based on a user's final recommendations.

For each asset provided, you will perform the following steps:

1.  **IDENTIFY REPAIRS AND BUILD COST BREAKDOWN.**
    - Create an empty 'costBreakdown' list for the asset.
    - Read the user's final recommendation list from the 'userRecommendation' field.
    - For each item in the 'userRecommendation' list:
        - **Identify Repair Type**: Search the 'Available Repairs and Prices' list for a 'repairType' that addresses the problem. Be flexible with synonyms (e.g., a recommendation for a 'cracked cover' should match the 'Lid Replacement' repair type).
	            - If a confident match is found in the price list, add an object to the 'costBreakdown' list containing the matched 'repairType' and its 'unitPrice'.
		        - If you DO NOT find a confident match, you will still account for this repair later, but do not add it to the cost breakdown.
	    - If the user's recommendation is "No action needed" or similar, the 'recommendedRepairType' array should contain "None".

2.  **FINALIZE REPAIR LIST AND COST.**
    - The final 'recommendedRepairType' list should contain ALL items from the 'userRecommendation' list, regardless of whether they were found in the price list.
    - Calculate the total 'estimatedCost' by summing the 'unitPrice' for every item in the 'costBreakdown' list you built. The cost should only include items with a price.
    - Set 'needsPrice' to true if any item from the 'userRecommendation' list was not found in the 'Available Repairs and Prices' list. Otherwise, set it to false.
    - If the user's recommendation is "No action needed" or similar, the 'recommendedRepairType' array should contain "None", 'costBreakdown' should be an empty array, 'estimatedCost' should be 0, and 'needsPrice' should be false.

---
**Available Repairs and Prices:**
{{#each repairPrices}}
- {{repairType}}: \${{unitPrice}} (Description: {{description}})
{{/each}}

---
**Assets to Process:**
{{#each assets}}
- Asset ID: {{assetId}}
  - User Recommendation: {{#each userRecommendation}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

Return your answer as a list of cost calculations, one for each asset ID, in the format prescribed by the output schema. Ensure all fields are populated for every asset.
`,
});


const generateCostsFlow = ai.defineFlow(
    {
        name: 'generateCostsFlow',
        inputSchema: GenerateCostsInputSchema,
        outputSchema: GenerateCostsOutputSchema,
    },
    async (input) => {
        const BATCH_SIZE = 50;
        const batches = [];
        for (let i = 0; i < input.assets.length; i += BATCH_SIZE) {
            batches.push(input.assets.slice(i, i + BATCH_SIZE));
        }

        const batchPromises = batches.map(batch => 
            generateCostsPrompt({
                assets: batch,
                repairPrices: input.repairPrices,
            })
        );

        const batchResults = await Promise.allSettled(batchPromises);

        const allCosts = batchResults.flatMap(result => {
             if (result.status === 'fulfilled' && result.value.output?.costs) {
                return result.value.output.costs;
            }
            if (result.status === 'rejected') {
                console.error("A batch failed to process:", result.reason);
            }
            return [];
        });

        return { costs: allCosts };
    }
);
