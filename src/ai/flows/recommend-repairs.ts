
'use server';

/**
 * @fileOverview A repair recommendation AI agent.
 *
 * - recommendRepairsForAllAssets - A function that recommends repairs for a list of assets.
 * - generateCostsForRecommendations - A function that generates costs based on user-verified recommendations.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssetSchema = z.object({
  assetId: z.string(),
  address: z.string(),
  yearInstalled: z.number(),
  material: z.enum(['Concrete', 'Polyethylene', 'Fibreglass']),
  setbackFromWaterSource: z.number(),
  setbackFromHouse: z.number(),
  tankBuryDepth: z.number(),
  openingSize: z.number(),
  aboveGroundCollarHeight: z.number(),
  septicSystemType: z.enum(['Cistern', 'Septic Tank']),
  assetSubType: z.enum(['Cistern', 'Pump Out', 'Mound', 'Septic Field', 'Other']),
  siteCondition: z.number(),
  coverCondition: z.number(),
  collarCondition: z.number(),
  interiorCondition: z.number(),
  overallCondition: z.number(),
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
    recommendation: z.array(z.string()).describe('A list of recommended repair or replacement actions. Each item should be a short summary.'),
    estimatedRemainingLife: z.string().describe("An estimate of the remaining life of the asset. It MUST be one of the following values: '0-5 years', '5-10 years', '10-15 years', '15-20 years', or '20-25 years'."),
});


const RecommendRepairsAllAssetsOutputSchema = z.object({
    recommendations: z.array(SingleAssetRecommendationSchema),
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
    repairType: z.string().describe("The specific repair type from the price list."),
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


const allAssetsPrompt = ai.definePrompt({
  name: 'recommendRepairsForAllAssetsPrompt',
  input: { schema: RecommendRepairsAllAssetsInputSchema },
  output: { schema: RecommendRepairsAllAssetsOutputSchema },
  prompt: `You are an AI asset management expert. For each asset provided, you MUST perform two distinct tasks:
1.  Estimate the remaining life.
2.  Recommend repairs.

You must provide a response for every asset.

---
**TASK 1: ESTIMATE REMAINING LIFE (FOR EACH ASSET)**
For each asset, provide an estimate of its remaining useful life.
- First, check if the asset matches any of the user-defined rules that specify a "remaining life". If a rule matches, you MUST use the life expectancy from that rule.
- If no life rule matches, then base your estimate on its 'Year Installed', all condition scores, 'Material', and system type.
- You MUST choose from one of the following 5-year increment options: "0-5 years", "5-10 years", "10-15 years", "20-25 years".
- The maximum value is "20-25 years".
- If a full replacement is recommended in Task 2, the remaining life should generally be '0-5 years', unless a life rule specifies otherwise.

---
**TASK 2: RECOMMEND REPAIRS (FOR EACH ASSET)**
For each asset, you will create a list of one or more repair recommendations. Follow this logic precisely:

1.  **COMBINE RULE-BASED AND FIELD-NOTE-BASED ANALYSIS.**
    - First, check if the asset's data matches any of the user-defined rules that specify a "recommendation". Collect all matching rule-based recommendations.
    - Second, independently analyze the 'Field Notes' and condition scores to identify any other problems that require repairs.
    - Combine the findings from both sources to create a final list of recommendations. For example, if a rule recommends moving a tank and the field notes mention a broken conduit, you must recommend both repairs.

2.  **HANDLE NO ACTION.**
    - If no rules apply, 'Field Notes' are clear (e.g., "OK"), and condition scores are good (4 or 5), then no action is needed.
    - In this case, the 'recommendation' array should contain only "No action needed".

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
  - System Type: {{septicSystemType}}
  - Sub-Type: {{assetSubType}}
  - Site Condition: {{siteCondition}}/5
  - Cover Condition: {{coverCondition}}/5
  - Collar Condition: {{collarCondition}}/5
  - Interior Condition: {{interiorCondition}}/5
  - Overall Condition: {{overallCondition}}/5
  - Field Notes: "{{fieldNotes}}"
{{/each}}

Return your answer as a list of recommendations, one for each asset ID, in the format prescribed by the output schema. Ensure all fields in the output schema are populated for every asset.
`,
});

const recommendRepairsForAllAssetsFlow = ai.defineFlow(
    {
        name: 'recommendRepairsForAllAssetsFlow',
        inputSchema: RecommendRepairsAllAssetsInputSchema,
        outputSchema: RecommendRepairsAllAssetsOutputSchema,
    },
    async (input) => {
        const { output } = await allAssetsPrompt(input);
        return output!;
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
        - **Identify Repair Type**: Search the 'Available Repairs and Prices' list for a 'repairType' that is an EXACT, case-insensitive match to the user's recommendation.
            - If an exact match is found in the price list, add an object to the 'costBreakdown' list containing the matched 'repairType' and its 'unitPrice'.
	        - If you DO NOT find an exact match, you will still account for this repair later, but do not add it to the cost breakdown. Do NOT use synonyms or infer matches.
	    - If the user's recommendation is "No action needed" or similar, the 'recommendedRepairType' array should contain "None".

2.  **FINALIZE REPAIR LIST AND COST.**
    - The final 'recommendedRepairType' list should contain ALL items from the user's recommendation list, regardless of whether they were found in the price list.
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
        const { output } = await generateCostsPrompt(input);
        return output!;
    }
);
