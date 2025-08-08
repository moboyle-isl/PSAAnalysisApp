
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


const recommendSingleRepairPrompt = ai.definePrompt({
    name: 'recommendSingleRepairPrompt',
    input: { schema: z.object({
        asset: AssetSchema,
        rules: z.string(),
    }) },
    output: { schema: SingleAssetRecommendationSchema },
    config: {
        temperature: 0,
    },
    prompt: `You are an AI asset management expert. For the single asset provided, you MUST perform two distinct tasks in a specific order:
1.  Estimate the remaining life.
2.  Recommend repairs.

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
**Asset to Analyze:**
- Asset ID: {{asset.assetId}}
  - Address: {{asset.address}}
  - Year Installed: {{asset.yearInstalled}}
  - Material: {{asset.material}}
  - Setback Water (m): {{asset.setbackFromWaterSource}}
  - Setback House (m): {{asset.setbackFromHouse}}
  - Bury Depth (m): {{asset.tankBuryDepth}}
  - Opening Size (m): {{asset.openingSize}}
  - Collar Height (m): {{asset.aboveGroundCollarHeight}}
  - System Type: {{asset.systemType}}
  - Sub-Type: {{asset.assetSubType}}
  - Site Condition: {{asset.siteCondition}}
  - Cover Condition: {{asset.coverCondition}}
  - Collar Condition: {{asset.collarCondition}}
  - Interior Condition: {{asset.interiorCondition}}
  - Overall Condition: {{asset.overallCondition}}
  - Abandoned / Not in Use?: {{asset.abandoned}}
  - Field Notes: "{{asset.fieldNotes}}"
---

Return your answer as a single JSON object in the format prescribed by the output schema. Ensure all fields in the output schema are populated.
`,
});

const recommendRepairsForAllAssetsFlow = ai.defineFlow(
    {
        name: 'recommendRepairsForAllAssetsFlow',
        inputSchema: RecommendRepairsAllAssetsInputSchema,
        outputSchema: RecommendRepairsAllAssetsOutputSchema,
    },
    async (input) => {
        const promises = input.assets.map(asset => 
            recommendSingleRepairPrompt({
                asset: asset,
                rules: input.rules,
            }).catch(err => {
                // Ensure errors are caught per-asset and transformed into a standard error object
                const reason = err instanceof Error ? err.message : String(err);
                return { 
                    error: true, 
                    assetId: asset.assetId,
                    message: `Failed to get recommendation: ${reason}` 
                };
            })
        );

        const results = await Promise.allSettled(promises);

        const allRecommendations: SingleAssetRecommendationSchema[] = [];
        const allErrors: { assetId: string; message: string; }[] = [];

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                const value = result.value;
                if (value.error) {
                    // Handle custom error object from the .catch block
                    allErrors.push({ assetId: value.assetId, message: value.message });
                } else if (value.output) {
                    allRecommendations.push(value.output);
                } else {
                    // This case might not be reachable with the current logic but is a good safeguard.
                    console.error("Unexpected fulfilled promise without output or error:", value);
                }
            } else { // status is 'rejected'
                // This will catch unexpected failures in the prompt call itself.
                // We don't have the asset context here, so this indicates a systemic issue.
                // For now, we will log this. A more robust solution might involve
                // mapping back the failed promise to its original asset.
                console.error("A recommendation promise was rejected:", result.reason);
            }
        });
        
        // Final check for any assets that were not processed at all
        const processedAssetIds = new Set([
            ...allRecommendations.map(r => r.assetId),
            ...allErrors.map(e => e.assetId)
        ]);

        for (const asset of input.assets) {
            if (!processedAssetIds.has(asset.assetId)) {
                allErrors.push({
                    assetId: asset.assetId,
                    message: "The AI model did not return a recommendation for this asset.",
                });
            }
        }

        return { 
            recommendations: allRecommendations,
            errors: allErrors
        };
    }
);


const generateSingleAssetCostPrompt = ai.definePrompt({
    name: 'generateSingleAssetCostPrompt',
    input: {
        schema: z.object({
            asset: z.object({
                assetId: z.string(),
                userRecommendation: z.array(z.string()),
            }),
            repairPrices: z.array(RepairPriceSchema),
        }),
    },
    output: { schema: SingleAssetCostSchema },
    prompt: `You are an AI assistant that determines specific repair types and calculates costs for a SINGLE asset based on a user's final recommendations.

Follow these steps precisely:

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
    - If the user's recommendation is "No action needed" or similar, you MUST ensure 'recommendedRepairType' contains "None", 'costBreakdown' is an empty array, 'estimatedCost' is 0, and 'needsPrice' is false.

---
**Available Repairs and Prices:**
{{#each repairPrices}}
- {{repairType}}: \${{unitPrice}} (Description: {{description}})
{{/each}}

---
**Asset to Process:**
- Asset ID: {{asset.assetId}}
- User Recommendation: {{#each asset.userRecommendation}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}

---
Return your answer as a single JSON object for this asset, in the format prescribed by the output schema. You MUST populate all fields.
`,
});

const generateCostsFlow = ai.defineFlow(
    {
        name: 'generateCostsFlow',
        inputSchema: GenerateCostsInputSchema,
        outputSchema: GenerateCostsOutputSchema,
    },
    async (input) => {
        const assetsToProcess = input.assets.filter(a => a.userRecommendation && a.userRecommendation.length > 0);

        const promises = assetsToProcess.map(asset =>
            generateSingleAssetCostPrompt({
                asset: asset,
                repairPrices: input.repairPrices,
            }).catch(err => {
                const reason = err instanceof Error ? err.message : String(err);
                console.error(`Cost generation for asset ${asset.assetId} failed:`, reason);
                return null; // Return null on failure to filter out later
            })
        );

        const results = await Promise.allSettled(promises);

        const allCosts: SingleAssetCostSchema[] = [];
        results.forEach((result, index) => {
            const assetId = assetsToProcess[index].assetId;
            if (result.status === 'fulfilled' && result.value?.output) {
                allCosts.push(result.value.output);
            } else if (result.status === 'fulfilled' && !result.value?.output) {
                // This handles the case where the promise resolved but didn't return a valid output object.
                console.error(`Cost generation for asset ${assetId} succeeded but returned no output.`);
            }
             else if (result.status === 'rejected') {
                console.error(`Cost generation promise for asset ${assetId} was rejected:`, result.reason);
            }
        });

        return { costs: allCosts };
    }
);
