'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { recommendRepairs } from '@/app/actions';
import type { RecommendRepairsOutput } from '@/ai/flows/recommend-repairs';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const recommendationsSchema = z.object({
  assetType: z.string().min(1, 'Asset type is required.'),
  conditionData: z.string().min(1, 'Condition data is required.'),
  userDefinedRules: z.string().optional(),
});

export function RecommendationsClient() {
  const [result, setResult] = useState<RecommendRepairsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof recommendationsSchema>>({
    resolver: zodResolver(recommendationsSchema),
    defaultValues: {
      assetType: '',
      conditionData: '',
      userDefinedRules: 'Prioritize repairs that extend life by over 5 years. Replace if repair cost exceeds 60% of new asset cost.',
    },
  });

  async function onSubmit(values: z.infer<typeof recommendationsSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await recommendRepairs(values);
      setResult(res);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to get recommendations. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="assetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Pump, Valve" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conditionData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition Data</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the asset's current condition, including any issues."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userDefinedRules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User-Defined Rules</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any specific rules for recommendations."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Get Recommendations
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>Analyzing asset data...</p>
          </div>
        )}
        {!isLoading && !result && (
            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <Sparkles className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">AI Recommendations will appear here</h3>
                <p>Fill out the form to get started.</p>
            </div>
        )}
        {result && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-accent" />
                AI-Generated Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Recommendation:</h4>
                <p className="text-muted-foreground">{result.recommendations}</p>
              </div>
              <div>
                <h4 className="font-semibold">Reasoning:</h4>
                <p className="text-muted-foreground">{result.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
