
'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash, Wand2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';

export type Rule = {
  id: string;
  column: string;
  ruleType: 'fixed' | 'text';
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value?: string | number;
  conditionText?: string;
  recommendationText: string;
};

const ASSET_COLUMNS = [
    { key: 'yearInstalled', label: 'Year Installed', type: 'number' },
    { key: 'material', label: 'Material', type: 'enum', options: ['Concrete', 'Polyethylene', 'Fibreglass'] },
    { key: 'septicSystemType', label: 'System Type', type: 'enum', options: ['Cistern', 'Septic Tank'] },
    { key: 'assetSubType', label: 'Sub-Type', type: 'enum', options: ['Cistern', 'Pump Out', 'Mound', 'Septic Field', 'Other'] },
    { key: 'setbackFromWaterSource', label: 'Setback Water (m)', type: 'number' },
    { key: 'setbackFromHouse', label: 'Setback House (m)', type: 'number' },
    { key: 'tankBuryDepth', label: 'Bury Depth (m)', type: 'number' },
    { key: 'openingSize', label: 'Opening Size (m)', type: 'number' },
    { key: 'aboveGroundCollarHeight', label: 'Collar Height (m)', type: 'number' },
    { key: 'siteCondition', label: 'Site Condition', type: 'number' },
    { key: 'coverCondition', label: 'Cover Condition', type: 'number' },
    { key: 'collarCondition', label: 'Collar Condition', type: 'number' },
    { key: 'interiorCondition', label: 'Interior Condition', type: 'number' },
    { key: 'overallCondition', label: 'Overall Condition', type: 'number' },
    { key: 'fieldNotes', label: 'Field Notes', type: 'string' },
];

const OPERATORS = {
  string: [ { value: 'contains', label: 'Contains' } ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '!=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
  ],
  enum: [ { value: 'eq', label: 'Is' }, { value: 'neq', label: 'Is not' } ],
};

const ruleSchema = z.object({
    column: z.string().min(1, 'Please select a column.'),
    ruleType: z.enum(['fixed', 'text']),
    operator: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    conditionText: z.string().optional(),
    recommendationText: z.string().min(1, 'Please provide a recommendation.'),
}).refine(data => {
    if (data.ruleType === 'fixed') {
        return !!data.operator && (data.value !== undefined && data.value !== '');
    }
    if (data.ruleType === 'text') {
        return !!data.conditionText && data.conditionText.length > 0;
    }
    return false;
}, {
    message: "Please complete the required fields for the selected rule type.",
    path: ['value'], // Or a more appropriate path
});


export function RulesClient() {
  const [rules, setRules] = useLocalStorage<Rule[]>('aiRules', []);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      column: '',
      ruleType: 'fixed',
      operator: undefined,
      value: '',
      conditionText: '',
      recommendationText: '',
    },
  });

  const watchRuleType = form.watch('ruleType');
  const watchColumn = form.watch('column');

  const selectedColumn = ASSET_COLUMNS.find(c => c.key === watchColumn);

  function onSubmit(data: z.infer<typeof ruleSchema>) {
    const newRule: Rule = {
      id: `RULE-${Date.now()}`,
      column: data.column,
      ruleType: data.ruleType,
      recommendationText: data.recommendationText,
      ...(data.ruleType === 'fixed' && {
        operator: data.operator as Rule['operator'],
        value: selectedColumn?.type === 'number' ? Number(data.value) : data.value,
      }),
      ...(data.ruleType === 'text' && {
        conditionText: data.conditionText,
      }),
    };
    setRules([...rules, newRule]);
    form.reset();
  }

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };
  
  const renderRule = (rule: Rule) => {
      const column = ASSET_COLUMNS.find(c => c.key === rule.column);
      if (!column) return null;

      if (rule.ruleType === 'text') {
        return (
            <span>If <span className="font-semibold">{column.label}</span> contains: <span className="font-mono p-1 bg-muted rounded-md">{rule.conditionText}</span></span>
        );
      }

      if (rule.ruleType === 'fixed') {
          const operator = [...OPERATORS.number, ...OPERATORS.enum, ...OPERATORS.string].find(o => o.value === rule.operator);
          return (
            <span>If <span className="font-semibold">{column.label}</span> is <span className="font-semibold">{operator?.label.toLowerCase() || ''}</span> <span className="font-mono p-1 bg-muted rounded-md">{String(rule.value)}</span></span>
          )
      }

      return null;
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Rule</CardTitle>
          <CardDescription>
            Build rules to guide the AI. For example: "If Overall Condition is less than 3, then recommend a full system replacement."
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem>
                    <Label>Rule Type</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Value</SelectItem>
                        <SelectItem value="text">Text Input</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="column"
                render={({ field }) => (
                  <FormItem>
                    <Label>If this Asset Column...</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a column..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSET_COLUMNS.map(col => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchRuleType === 'fixed' && selectedColumn && (
                <>
                  <FormField
                    control={form.control}
                    name="operator"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Has this condition...</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a condition..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {OPERATORS[selectedColumn.type as keyof typeof OPERATORS]?.map(op => (
                              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <Label>With this value...</Label>
                        <FormControl>
                          {selectedColumn.type === 'enum' ? (
                             <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                                <SelectTrigger><SelectValue placeholder="Select a value..." /></SelectTrigger>
                                <SelectContent>
                                    {selectedColumn.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                          ) : (
                            <Input placeholder="Enter a value" {...field} type={selectedColumn.type === 'number' ? 'number' : 'text'} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {watchRuleType === 'text' && (
                <FormField
                  control={form.control}
                  name="conditionText"
                  render={({ field }) => (
                    <FormItem>
                      <Label>And contains this text...</Label>
                      <FormControl>
                        <Textarea placeholder="e.g., 'roots', 'damaged lid'" {...field} />
                      </FormControl>
                       <p className="text-xs text-muted-foreground">Provide keywords or phrases to look for.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

                <FormField
                    control={form.control}
                    name="recommendationText"
                    render={({ field }) => (
                        <FormItem>
                            <Label>Then, recommend...</Label>
                            <FormControl>
                                <Textarea placeholder="e.g., A full system replacement." {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">This is the exact recommendation text the AI will use.</p>
                            <FormMessage />
                        </FormItem>
                    )}
                />

              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
          <CardDescription>
            These rules will be sent to the AI to influence its recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isClient ? (
            rules.length > 0 ? (
              <ul className="space-y-4">
                {rules.map(rule => (
                  <li key={rule.id} className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                        <Wand2 className="h-5 w-5 text-primary shrink-0 mt-1" />
                        <div className="flex-1">
                            <p className="font-medium">{renderRule(rule)}</p>
                            <p className="text-sm text-muted-foreground">Then, recommend: <span className="font-semibold">{rule.recommendationText}</span></p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                <p>No rules defined yet.</p>
                <p className="text-sm">Use the form to create your first rule.</p>
              </div>
            )
          ) : (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
