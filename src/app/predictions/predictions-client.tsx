'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { predictRemainingLife } from '@/app/actions';
import type { PredictRemainingLifeOutput } from '@/ai/flows/predict-remaining-life';

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
import { Loader2, Sparkles, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';

const predictionsSchema = z.object({
  assetType: z.string().min(1, 'Asset type is required.'),
  conditionScore: z.number().min(0).max(100),
  maintenanceHistory: z.string().optional(),
  usageIntensity: z.string().optional(),
});

export function PredictionsClient() {
  const [result, setResult] = useState<PredictRemainingLifeOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof predictionsSchema>>({
    resolver: zodResolver(predictionsSchema),
    defaultValues: {
      assetType: '',
      conditionScore: 80,
      maintenanceHistory: '',
      usageIntensity: '',
    },
  });

  async function onSubmit(values: z.infer<typeof predictionsSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await predictRemainingLife(values);
      setResult(res);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to get prediction. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const conditionScore = form.watch('conditionScore');

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
                      <Input placeholder="e.g., Pipe, Tank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conditionScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition Score: {conditionScore}</FormLabel>
                    <FormControl>
                      <Slider
                        defaultValue={[80]}
                        max={100}
                        step={1}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maintenanceHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance History</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe past maintenance..."
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
                name="usageIntensity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usage Intensity</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Light, Moderate, Heavy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <History className="mr-2 h-4 w-4" />
                )}
                Predict Remaining Life
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>Running prediction model...</p>
          </div>
        )}
        {!isLoading && !result && (
            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <Sparkles className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">Life Prediction will appear here</h3>
                <p>Fill out the form to get started.</p>
            </div>
        )}
        {result && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-accent" />
                AI-Generated Prediction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Estimated Remaining Life:</h4>
                <p className="text-2xl font-bold text-primary">{result.estimatedRemainingLife}</p>
              </div>
              <div>
                <h4 className="font-semibold">Confidence Level:</h4>
                <p className="text-muted-foreground">{result.confidenceLevel}</p>
              </div>
              <div>
                <h4 className="font-semibold">Rationale:</h4>
                <p className="text-muted-foreground">{result.rationale}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
