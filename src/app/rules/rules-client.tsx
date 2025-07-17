
'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash, Wand2, Pencil, GripVertical, CircleHelp } from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
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

export type Rule = {
  id: string;
  conditions: Condition[];
  logicalOperator: 'AND' | 'OR';
  recommendationText: string;
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
        return !!data.conditionText;
    }

    if (selectedColumn.type === 'number' || selectedColumn.type === 'enum') {
        return !!data.operator && (data.value !== undefined && data.value !== '');
    }
    
    return false;
}, {
    message: "Please provide a value for the condition.",
    path: ["value"],
});


const ruleSchema = z.object({
    conditions: z.array(conditionSchema).min(1, "Please add at least one condition."),
    logicalOperator: z.enum(['AND', 'OR']),
    recommendationText: z.string().min(1, 'Please provide a recommendation.'),
})

export function RulesClient() {
  const [rules, setRules] = useLocalStorage<Rule[]>('aiRules', []);
  const [isClient, setIsClient] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
        conditions: [],
        logicalOperator: 'AND',
        recommendationText: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions"
  });

  const watchConditions = form.watch('conditions');
  
  const handleAddNewCondition = () => {
    const firstColumn = ASSET_COLUMNS[0];
    append({
        column: firstColumn.key,
        ruleType: firstColumn.type === 'string' ? 'text' : 'fixed',
        operator: undefined,
        value: '',
        conditionText: ''
    });
  };

  useEffect(() => {
    if (isDialogOpen && fields.length === 0) {
        handleAddNewCondition();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, fields.length]);


  function onSubmit(data: z.infer<typeof ruleSchema>) {
    if (editingRule) {
      const updatedRule: Rule = { ...editingRule, ...data };
      setRules(rules.map(r => r.id === editingRule.id ? updatedRule : r));
    } else {
      const newRule: Rule = { id: `RULE-${Date.now()}`, ...data };
      setRules([...rules, newRule]);
    }
    
    form.reset();
    setEditingRule(null);
    setIsDialogOpen(false);
  }

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const handleOpenDialog = (rule: Rule | null = null) => {
    setEditingRule(rule);
    if (rule) {
      form.reset({
        conditions: rule.conditions,
        logicalOperator: rule.logicalOperator,
        recommendationText: rule.recommendationText,
      });
    } else {
      form.reset({
        conditions: [],
        logicalOperator: 'AND',
        recommendationText: '',
      });
    }
    setIsDialogOpen(true);
  }
  
  const renderRule = (rule: Rule) => {
      const conditions = rule.conditions.map((cond, index) => {
        const column = ASSET_COLUMNS.find(c => c.key === cond.column);
        if (!column) return null;
        
        let conditionStr = '';
        if (column.type === 'string') {
             conditionStr = <span><span className="font-semibold">{column.label}</span> contains: <span className="font-mono p-1 bg-muted rounded-md">{cond.conditionText}</span></span>
        } else {
            const operator = [...OPERATORS.number, ...OPERATORS.enum].find(o => o.value === cond.operator);
            conditionStr = <span><span className="font-semibold">{column.label}</span> is <span className="font-semibold">{operator?.label.toLowerCase() || ''}</span> <span className="font-mono p-1 bg-muted rounded-md">{String(cond.value)}</span></span>
        }

        return (
            <span key={index} className="block">
                {conditionStr}
            </span>
        )
      });
      
      const operator = <span className="font-bold mx-2">{rule.logicalOperator}</span>;

      return (
        <div>
            <span className="font-medium">If:</span>
            <div className="pl-4">
                {conditions.reduce((prev, curr, i) => (
                    // @ts-ignore
                    [prev, (i > 0 ? <div key={`op-${i}`}>{operator}</div> : null), curr]
                ), [])}
            </div>
        </div>
      )
  }

  return (
    <div className="space-y-8">
    <TooltipProvider>
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setEditingRule(null);
              form.reset();
          }
          setIsDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create a New Rule'}</DialogTitle>
            <DialogDescription>
              Build rules with one or more conditions to guide the AI. 
              For example: "If System Type = Septic Tank AND Setback Water (m) &lt; 10..."
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="font-semibold">Conditions</Label>
                
                {fields.map((field, index) => {
                    const selectedColumnKey = watchConditions[index]?.column;
                    const selectedColumn = ASSET_COLUMNS.find(c => c.key === selectedColumnKey);

                    return (
                        <div key={field.id} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                            <GripVertical className="h-5 w-5 text-muted-foreground mt-9 shrink-0" />
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`conditions.${index}.column`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <Label>If Column...</Label>
                                        <Select 
                                            onValueChange={(value) => {
                                                const newSelectedColumn = ASSET_COLUMNS.find(c => c.key === value);
                                                const newRuleType = newSelectedColumn?.type === 'string' ? 'text' : 'fixed';
                                                form.setValue(`conditions.${index}.ruleType`, newRuleType);
                                                field.onChange(value);
                                            }} 
                                            value={field.value}>
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

                                {selectedColumn && selectedColumn.type !== 'string' && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name={`conditions.${index}.operator`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <Label>Is...</Label>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
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
                                            name={`conditions.${index}.value`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <Label>Than...</Label>
                                                <FormControl>
                                                {selectedColumn.type === 'enum' ? (
                                                    <Select onValueChange={field.onChange} value={field.value as string}>
                                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {selectedColumn.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Input placeholder="Enter value" {...field} type="number" value={field.value ?? ''} />
                                                )}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                                 {selectedColumn && selectedColumn.type === 'string' && (
                                     <FormField
                                        control={form.control}
                                        name={`conditions.${index}.conditionText`}
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                            <Label>And contains this text...</Label>
                                            <FormControl>
                                                <Input placeholder="e.g., 'roots', 'damaged lid'" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                 )}
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive mt-7" onClick={() => remove(index)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    )
                })}
                 <Button type="button" variant="outline" size="sm" onClick={handleAddNewCondition}>
                    <Plus className="mr-2 h-4 w-4" /> Add Condition
                </Button>
              </div>

               {fields.length > 1 && (
                  <FormField
                    control={form.control}
                    name="logicalOperator"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <Label className="font-semibold">Logical Operator</Label>
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
                <FormField
                    control={form.control}
                    name="recommendationText"
                    render={({ field }) => (
                        <FormItem>
                            <Label className="font-semibold flex items-center gap-2">
                                Then, Recommend...
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <CircleHelp className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">This is the exact recommendation text the AI will use. It should match an item in your Price list if you want to auto-assign a cost.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <FormControl>
                                <Textarea placeholder="e.g., A full system replacement." {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
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
      </Dialog>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Active Rules</CardTitle>
                <CardDescription>
                    These rules will be sent to the AI to influence its recommendations.
                </CardDescription>
            </div>
            {isClient && (
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rule
                </Button>
            )}
        </CardHeader>
        <CardContent>
          {isClient ? (
            rules.length > 0 ? (
              <ul className="space-y-4">
                {rules.map(rule => (
                  <li key={rule.id} className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                        <Wand2 className="h-5 w-5 text-primary shrink-0 mt-1" />
                        <div className="flex-1">
                            {renderRule(rule)}
                            <Separator className="my-2" />
                            <p className="text-sm">Then, recommend: <span className="font-semibold text-primary">{rule.recommendationText}</span></p>
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
      </TooltipProvider>
    </div>
  );
}
