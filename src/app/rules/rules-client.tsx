
'use client';

import { useState, useEffect } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash, Wand2, Pencil, GripVertical, CircleHelp, Wrench, Clock } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type Condition = {
  id?: string;
  column: string;
  ruleType: 'fixed' | 'text';
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value?: string | number;
  conditionText?: string;
};

const lifeExpectancyOptions = ["0-5 years", "5-10 years", "10-15 years", "15-20 years", "20-25 years"] as const;

export type Rule = {
  id: string;
  ruleType: 'REPAIR' | 'REMAINING_LIFE';
  conditions: Condition[];
  logicalOperator: 'AND' | 'OR';
  recommendationText?: string;
  lifeExpectancy?: typeof lifeExpectancyOptions[number];
};

export const ASSET_COLUMNS = [
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

export const OPERATORS = {
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

const conditionSchema = z.object({
    id: z.string().optional(),
    column: z.string().min(1, 'Please select a column.'),
    ruleType: z.enum(['fixed', 'text']),
    operator: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    conditionText: z.string().optional(),
}).refine(data => {
    const selectedColumn = ASSET_COLUMNS.find(c => c.key === data.column);
    if (!selectedColumn) return true; // Let main schema handle required column

    if (selectedColumn.type === 'string') {
        return !!data.conditionText && data.conditionText.length > 0;
    }

    if (selectedColumn.type === 'number' || selectedColumn.type === 'enum') {
        return !!data.value && data.value !== '';
    }
    
    return false;
}, {
    message: "Please provide a value for the condition.",
    path: ["value"],
});


const ruleSchema = z.object({
    ruleType: z.enum(['REPAIR', 'REMAINING_LIFE']),
    logicalOperator: z.enum(['AND', 'OR']),
    recommendationText: z.string().optional(),
    lifeExpectancy: z.enum(lifeExpectancyOptions).optional(),
}).refine(data => {
    if (data.ruleType === 'REPAIR') {
        return !!data.recommendationText && data.recommendationText.length > 0;
    }
    return true;
}, {
    message: 'Please provide a recommendation.',
    path: ['recommendationText'],
}).refine(data => {
    if (data.ruleType === 'REMAINING_LIFE') {
        return !!data.lifeExpectancy;
    }
    return true;
}, {
    message: 'Please select a life expectancy.',
    path: ['lifeExpectancy'],
});

export function RulesClient() {
  const { rules, setRules, isReady } = useProjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);

  const form = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
        ruleType: 'REPAIR',
        logicalOperator: 'AND',
        recommendationText: '',
        lifeExpectancy: undefined,
    },
  });

  const watchRuleType = form.watch('ruleType');
  
  const handleAddNewCondition = () => {
    const firstColumn = ASSET_COLUMNS[0];
    const newCondition: Condition = {
        id: `COND-${Date.now()}-${Math.random()}`,
        column: firstColumn.key,
        ruleType: firstColumn.type === 'string' ? 'text' : 'fixed',
        operator: undefined,
        value: '',
        conditionText: ''
    };
    setConditions(prev => [...prev, newCondition]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof Condition, value: any) => {
     setConditions(prev => {
        const newConditions = [...prev];
        const condition = {...newConditions[index], [field]: value};

        // If column changes, reset operator and value and update ruleType
        if (field === 'column') {
            const selectedColumn = ASSET_COLUMNS.find(c => c.key === value);
            condition.ruleType = selectedColumn?.type === 'string' ? 'text' : 'fixed';
            condition.operator = undefined;
            condition.value = '';
            condition.conditionText = '';
        }

        newConditions[index] = condition;
        return newConditions;
     });
  };

  // Effect to reset form when dialog opens/closes
  useEffect(() => {
    if (isDialogOpen) {
        if (editingRule) {
            form.reset({
                ruleType: editingRule.ruleType,
                logicalOperator: editingRule.logicalOperator,
                recommendationText: editingRule.recommendationText,
                lifeExpectancy: editingRule.lifeExpectancy,
            });
            // Ensure all conditions have a unique ID for rendering
            const conditionsWithIds = editingRule.conditions.map(c => ({
                ...c,
                id: c.id || `COND-${Date.now()}-${Math.random()}`
            }));
            setConditions(conditionsWithIds);
        } else {
            form.reset({
                ruleType: 'REPAIR',
                logicalOperator: 'AND',
                recommendationText: '',
                lifeExpectancy: undefined,
            });
            handleAddNewCondition();
        }
    } else {
        setEditingRule(null);
        setConditions([]);
        form.clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, editingRule]);


  function onSubmit(data: z.infer<typeof ruleSchema>) {
    // Validate all conditions before submitting
    for (const cond of conditions) {
        const result = conditionSchema.safeParse(cond);
        if (!result.success) {
            // This is a simple way to show an error. A more robust implementation
            // might involve showing errors next to each condition field.
            alert(`There's an error in one of your conditions. Please check all fields.`);
            return;
        }
    }
     if (conditions.length === 0) {
        alert("Please add at least one condition.");
        return;
    }


    if (editingRule) {
      const updatedRule: Rule = { ...editingRule, ...data, conditions };
      setRules(rules.map(r => r.id === editingRule.id ? updatedRule : r));
    } else {
      const newRule: Rule = { 
        id: `RULE-${Date.now()}`, 
        ...data, 
        conditions,
        recommendationText: data.ruleType === 'REPAIR' ? data.recommendationText : undefined, 
        lifeExpectancy: data.ruleType === 'REMAINING_LIFE' ? data.lifeExpectancy : undefined 
      };
      setRules([...rules, newRule]);
    }
    
    setIsDialogOpen(false);
  }

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const handleOpenDialog = (rule: Rule | null = null) => {
    setEditingRule(rule);
    setIsDialogOpen(true);
  }
  
  const renderRule = (rule: Rule) => {
      if (!rule.conditions || !Array.isArray(rule.conditions)) {
        return null; // Defensive check
      }
      const conditionsToRender = rule.conditions.map((cond, index) => {
        const column = ASSET_COLUMNS.find(c => c.key === cond.column);
        if (!column) return null;
        
        let conditionStr = '';
        if (column.type === 'string') {
             conditionStr = <span key={cond.id || index}><span className="font-semibold">{column.label}</span> contains: <span className="font-mono p-1 bg-muted rounded-md">{cond.conditionText}</span></span>
        } else {
            const operator = [...OPERATORS.number, ...OPERATORS.enum].find(o => o.value === cond.operator);
            conditionStr = <span key={cond.id || index}><span className="font-semibold">{column.label}</span> is <span className="font-semibold">{operator?.label.toLowerCase() || ''}</span> <span className="font-mono p-1 bg-muted rounded-md">{String(cond.value)}</span></span>
        }

        return (
            <span key={cond.id || index} className="block">
                {conditionStr}
            </span>
        )
      });
      
      const operator = <span className="font-bold mx-2">{rule.logicalOperator}</span>;

      return (
        <div>
            <span className="font-medium">If:</span>
            <div className="pl-4">
                {conditionsToRender.reduce((prev: React.ReactNode[], curr, i) => {
                    if (i === 0) return [curr];
                    return [...prev, <div key={`op-${i}`}>{operator}</div>, curr];
                }, [])}
            </div>
        </div>
      )
  }

  return (
    <div className="space-y-8">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <TooltipProvider>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create a New Rule'}</DialogTitle>
              <DialogDescription>
                Build rules with one or more conditions to guide the AI.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">

                <FormField
                  control={form.control}
                  name="ruleType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-semibold">What kind of rule is this?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <FormItem>
                            <FormControl>
                              <RadioGroupItem value="REPAIR" id="repair-rule" className="peer sr-only" />
                            </FormControl>
                            <FormLabel htmlFor="repair-rule" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                              <Wrench className="mb-3 h-6 w-6" />
                              Repair Recommendation
                            </FormLabel>
                          </FormItem>
                          <FormItem>
                            <FormControl>
                              <RadioGroupItem
                                value="REMAINING_LIFE"
                                id="life-rule"
                                className="peer sr-only"
                              />
                            </FormControl>
                            <FormLabel htmlFor="life-rule" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                              <Clock className="mb-3 h-6 w-6" />
                              Remaining Life Estimation
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 p-4 border rounded-lg">
                  <Label className="font-semibold">Conditions</Label>

                  {conditions.map((condition, index) => {
                    const selectedColumn = ASSET_COLUMNS.find(c => c.key === condition.column);

                    return (
                      <div key={condition.id} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-9 shrink-0" />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>If Column...</Label>
                            <Select
                              onValueChange={(value) => handleConditionChange(index, 'column', value)}
                              value={condition.column}>
                              <SelectTrigger><SelectValue placeholder="Select a column..." /></SelectTrigger>
                              <SelectContent>
                                {ASSET_COLUMNS.map(col => (
                                  <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedColumn && selectedColumn.type !== 'string' && (
                            <>
                              <div className="space-y-2">
                                <Label>Is...</Label>
                                <Select onValueChange={(value) => handleConditionChange(index, 'operator', value)} value={condition.operator}>
                                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                  <SelectContent>
                                    {(OPERATORS[selectedColumn.type as keyof typeof OPERATORS] || []).map(op => (
                                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Than...</Label>
                                {selectedColumn.type === 'enum' ? (
                                  <Select onValueChange={(value) => handleConditionChange(index, 'value', value)} value={condition.value as string}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                      {selectedColumn.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input placeholder="Enter value" type="number" value={condition.value ?? ''} onChange={(e) => handleConditionChange(index, 'value', e.target.value)} />
                                )}
                              </div>
                            </>
                          )}
                          {selectedColumn && selectedColumn.type === 'string' && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>And contains this text...</Label>
                              <Input placeholder="e.g., 'roots', 'damaged lid'" value={condition.conditionText ?? ''} onChange={(e) => handleConditionChange(index, 'conditionText', e.target.value)} />
                            </div>
                          )}
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive mt-7" onClick={() => handleRemoveCondition(index)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddNewCondition}>
                    <Plus className="mr-2 h-4 w-4" /> Add Condition
                  </Button>
                </div>

                {conditions.length > 1 && (
                  <FormField
                    control={form.control}
                    name="logicalOperator"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="font-semibold">Logical Operator</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center gap-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="AND" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                AND <span className="text-xs text-muted-foreground ml-1">(all conditions must be met)</span>
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="OR" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                OR <span className="text-xs text-muted-foreground ml-1">(any condition can be met)</span>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="space-y-2 p-4 border rounded-lg">
                  <Label className="font-semibold flex items-center gap-2">
                    Then, Define Outcome...
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleHelp className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          {watchRuleType === 'REPAIR'
                            ? "This is the exact recommendation text the AI will use. It should match an item in your Price list if you want to auto-assign a cost."
                            : "This is the remaining life that will be assigned if the conditions are met."
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  {watchRuleType === 'REPAIR' && (
                    <FormField
                      control={form.control}
                      name="recommendationText"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea placeholder="e.g., A full system replacement." {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {watchRuleType === 'REMAINING_LIFE' && (
                    <FormField
                      control={form.control}
                      name="lifeExpectancy"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select a life expectancy range..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {lifeExpectancyOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">{editingRule ? 'Save Changes' : 'Add Rule'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </TooltipProvider>
      </Dialog>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Rules</CardTitle>
            <CardDescription>
              These rules will be sent to the AI to influence its recommendations.
            </CardDescription>
          </div>
          {isReady && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
          )}
        </CardHeader>
        <CardContent>
          {isReady ? (
            rules.length > 0 ? (
              <ul className="space-y-4">
                {rules.map(rule => (
                  <li key={rule.id} className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      {rule.ruleType === 'REPAIR'
                        ? <Wrench className="h-5 w-5 text-primary shrink-0 mt-1" />
                        : <Clock className="h-5 w-5 text-primary shrink-0 mt-1" />
                      }
                      <div className="flex-1">
                        {renderRule(rule)}
                        <Separator className="my-2" />
                        {rule.ruleType === 'REPAIR' ? (
                          <p className="text-sm">Then, recommend: <span className="font-semibold text-primary">{rule.recommendationText}</span></p>
                        ) : (
                          <p className="text-sm">Then, remaining life is: <span className="font-semibold text-primary">{rule.lifeExpectancy}</span></p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleOpenDialog(rule)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit Rule</span>
                        </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete Rule</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                <p>No rules defined yet.</p>
                <p className="text-sm">Click "Add Rule" to create your first one.</p>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
