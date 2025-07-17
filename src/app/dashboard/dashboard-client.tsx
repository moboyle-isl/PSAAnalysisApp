
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Asset, RepairPrice } from '@/lib/data';
import { initialAssets, initialRepairPrices } from '@/lib/data';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, View, Filter as FilterIcon, X, CircleDollarSign, RotateCcw, Plus, Trash, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { recommendRepairsForAllAssets } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Rule } from '@/app/rules/rules-client';
import { ASSET_COLUMNS } from '@/app/rules/rules-client';

type AssetWithRecommendation = Asset & { 
  recommendation?: string;
  estimatedCost?: number;
  needsPrice?: boolean;
};

type Column = {
  key: keyof AssetWithRecommendation | 'actions';
  label: string;
  type: 'string' | 'number' | 'enum' | 'action';
  options?: string[];
  width?: string;
};

const ALL_COLUMNS: Column[] = [
    { key: 'assetId', label: 'Asset ID', type: 'string', width: '120px' },
    { key: 'address', label: 'Address', type: 'string', width: '300px' },
    { key: 'yearInstalled', label: 'Year Installed', type: 'number', width: '120px' },
    { key: 'material', label: 'Material', type: 'enum', options: ['Concrete', 'Polyethylene', 'Fibreglass'], width: '120px' },
    { key: 'septicSystemType', label: 'System Type', type: 'enum', options: ['Cistern', 'Septic Tank'], width: '120px' },
    { key: 'assetSubType', label: 'Sub-Type', type: 'enum', options: ['Cistern', 'Pump Out', 'Mound', 'Septic Field', 'Other'], width: '120px' },
    { key: 'setbackFromWaterSource', label: 'Setback Water (m)', type: 'number', width: '120px' },
    { key: 'setbackFromHouse', label: 'Setback House (m)', type: 'number', width: '120px' },
    { key: 'tankBuryDepth', label: 'Bury Depth (m)', type: 'number', width: '120px' },
    { key: 'openingSize', label: 'Opening Size (m)', type: 'number', width: '120px' },
    { key: 'aboveGroundCollarHeight', label: 'Collar Height (m)', type: 'number', width: '120px' },
    { key: 'siteCondition', label: 'Site Condition', type: 'number', width: '120px' },
    { key: 'coverCondition', label: 'Cover Condition', type: 'number', width: '120px' },
    { key: 'collarCondition', label: 'Collar Condition', type: 'number', width: '120px' },
    { key: 'interiorCondition', label: 'Interior Condition', type: 'number', width: '120px' },
    { key: 'overallCondition', label: 'Overall Condition', type: 'number', width: '120px' },
    { key: 'fieldNotes', label: 'Field Notes', type: 'string', width: '300px' },
    { key: 'recommendation', label: 'AI Recommendation', type: 'string', width: '300px' },
    { key: 'estimatedCost', label: 'Est. Cost', type: 'number', width: '120px' },
    { key: 'actions', label: 'Actions', type: 'action', width: '100px' },
];

const OPERATORS = {
  string: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'not_equals', label: 'Does not equal' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '!=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
  ],
  enum: [
    { value: 'eq', label: 'Is' },
    { value: 'neq', label: 'Is not' },
  ],
  action: [],
};

const OPERATOR_TEXT_MAP: Record<string, string> = {
  contains: 'contains',
  equals: 'is equal to',
  not_contains: 'does not contain',
  not_equals: 'is not equal to',
  eq: 'is equal to',
  neq: 'is not equal to',
  gt: 'is greater than',
  gte: 'is greater than or equal to',
  lt: 'is less than',
  lte: 'is less than or equal to',
};


type Filter = {
  id: string;
  column: keyof AssetWithRecommendation;
  operator: string;
  value: string | number;
};

type SortConfig = {
  key: keyof AssetWithRecommendation;
  direction: 'ascending' | 'descending';
};

const newAssetSchema = z.object({
  address: z.string().min(1, 'Address is required.'),
  yearInstalled: z.coerce.number().min(1900, 'Invalid year').max(new Date().getFullYear(), 'Year cannot be in the future.'),
  material: z.enum(['Concrete', 'Polyethylene', 'Fibreglass']),
  setbackFromWaterSource: z.coerce.number().min(0),
  setbackFromHouse: z.coerce.number().min(0),
  tankBuryDepth: z.coerce.number().min(0),
  openingSize: z.coerce.number().min(0),
  aboveGroundCollarHeight: z.coerce.number().min(0),
  septicSystemType: z.enum(['Cistern', 'Septic Tank']),
  assetSubType: z.enum(['Cistern', 'Pump Out', 'Mound', 'Septic Field', 'Other']),
  siteCondition: z.coerce.number().min(1).max(5),
  coverCondition: z.coerce.number().min(1).max(5),
  collarCondition: z.coerce.number().min(1).max(5),
  interiorCondition: z.coerce.number().min(1).max(5),
  overallCondition: z.coerce.number().min(1).max(5),
  fieldNotes: z.string().optional(),
}).refine(data => {
    if (data.septicSystemType === 'Cistern' && data.assetSubType !== 'Cistern') {
        return false;
    }
    return true;
}, {
    message: "Sub-type must be 'Cistern' if system type is 'Cistern'",
    path: ['assetSubType'],
});


export function DashboardClient({ data }: { data: Asset[] }) {
  const [assets, setAssets] = useLocalStorage<AssetWithRecommendation[]>('assets', initialAssets.map(d => ({ ...d, recommendation: undefined, estimatedCost: undefined, needsPrice: false })));
  const [repairPrices] = useLocalStorage<RepairPrice[]>('repairPrices', initialRepairPrices);
  const [rules] = useLocalStorage<Rule[]>('aiRules', []);
  const [editingCell, setEditingCell] = useState<string | null>(null); // 'rowId-colKey'
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isNewAssetDialogOpen, setIsNewAssetDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetWithRecommendation | null>(null);

  const form = useForm<z.infer<typeof newAssetSchema>>({
    resolver: zodResolver(newAssetSchema),
    defaultValues: {
      address: '',
      yearInstalled: new Date().getFullYear(),
      material: 'Concrete',
      setbackFromWaterSource: 0,
      setbackFromHouse: 0,
      tankBuryDepth: 0,
      openingSize: 0,
      aboveGroundCollarHeight: 0,
      septicSystemType: 'Septic Tank',
      assetSubType: 'Pump Out',
      siteCondition: 5,
      coverCondition: 5,
      collarCondition: 5,
      interiorCondition: 5,
      overallCondition: 5,
      fieldNotes: '',
    },
  });
  
  const septicSystemType = form.watch('septicSystemType');

  useEffect(() => {
    if (septicSystemType === 'Cistern') {
      form.setValue('assetSubType', 'Cistern');
    }
  }, [septicSystemType, form]);

  useEffect(() => {
    setIsClient(true);
    // On mount, check if local storage has been initialized. If not, use the server-provided data.
    const storedAssets = window.localStorage.getItem('assets');
    if (!storedAssets || JSON.parse(storedAssets).length === 0) {
      setAssets(data.map(d => ({ ...d, recommendation: undefined, estimatedCost: undefined, needsPrice: false })));
    }
  }, [data, setAssets]);
  
  const [columnVisibility, setColumnVisibility] = useLocalStorage<
    Record<string, boolean>
  >('columnVisibility', {
    assetId: true,
    address: true,
    yearInstalled: true,
    material: true,
    septicSystemType: true,
    assetSubType: true,
    setbackFromWaterSource: true,
    setbackFromHouse: true,
    tankBuryDepth: true,
    openingSize: true,
    aboveGroundCollarHeight: true,
    siteCondition: true,
    coverCondition: true,
    collarCondition: true,
    interiorCondition: true,
    overallCondition: true,
    fieldNotes: true,
    recommendation: true,
    estimatedCost: true,
    actions: true,
  });

  const [filters, setFilters] = useLocalStorage<Filter[]>('assetFilters', []);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<{column?: Column, operator?: string, value?: string}>({});
  
  const [sortConfig, setSortConfig] = useLocalStorage<SortConfig | null>('assetSortConfig', null);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<{key: string, direction: 'ascending' | 'descending'}>(sortConfig ? {key: sortConfig.key, direction: sortConfig.direction} : { key: 'assetId', direction: 'ascending' });

  const visibleColumns = ALL_COLUMNS.filter(
    (column) => columnVisibility[column.key]
  );
  
  const handleAddFilter = () => {
    if (currentFilter.column && currentFilter.operator && currentFilter.value !== undefined && currentFilter.value !== '') {
      const newFilter: Filter = {
        id: `filter-${Date.now()}`,
        column: currentFilter.column.key as keyof AssetWithRecommendation,
        operator: currentFilter.operator,
        value: currentFilter.column.type === 'number' ? Number(currentFilter.value) : currentFilter.value,
      };
      setFilters([...filters, newFilter]);
      setCurrentFilter({});
      setFilterPopoverOpen(false);
    }
  };
  
  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };
  
  const processedAssets = useMemo(() => {
    if (!isClient) {
      return []; // Return empty array on server to avoid hydration mismatch
    }
    
    let assetsToProcess = [...assets];
    
    // Filtering
    if (filters.length > 0) {
        assetsToProcess = assetsToProcess.filter(asset => {
          return filters.every(filter => {
            const assetValue = asset[filter.column];
            if (assetValue === undefined || assetValue === null) return false;
            
            const columnDef = ALL_COLUMNS.find(c => c.key === filter.column);
            
            switch (columnDef?.type) {
              case 'string':
              case 'enum':
                const strValue = String(assetValue).toLowerCase();
                const filterStrValue = String(filter.value).toLowerCase();
                if (filter.operator === 'contains') return strValue.includes(filterStrValue);
                if (filter.operator === 'equals') return strValue === filterStrValue;
                if (filter.operator === 'not_contains') return !strValue.includes(filterStrValue);
                if (filter.operator === 'not_equals') return strValue !== filterStrValue;
                break;
              case 'number':
                const numValue = Number(assetValue);
                const filterNumValue = Number(filter.value);
                if (filter.operator === 'equals' || filter.operator === 'eq') return numValue === filterNumValue;
                if (filter.operator === 'not_equals' || filter.operator === 'neq') return numValue !== filterNumValue;
                if (filter.operator === 'gt') return numValue > filterNumValue;
                if (filter.operator === 'gte') return numValue >= filterNumValue;
                if (filter.operator === 'lt') return numValue < filterNumValue;
                if (filter.operator === 'lte') return numValue <= filterNumValue;
                break;
            }
            return true;
          });
        });
    }

    // Sorting
    if (sortConfig) {
        assetsToProcess.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }


    return assetsToProcess;
  }, [isClient, assets, filters, sortConfig]);
  
  const totalRepairCost = useMemo(() => {
    return processedAssets.reduce((total, asset) => total + (asset.estimatedCost || 0), 0);
  }, [processedAssets]);


  const handleRunRecommendations = async () => {
    setIsGenerating(true);
    try {
      // Convert rules to a string format for the prompt
      const rulesString = rules.map(rule => {
        const conditionsString = rule.conditions.map(condition => {
            const columnLabel = ASSET_COLUMNS.find(c => c.key === condition.column)?.label || condition.column;
            if (condition.ruleType === 'fixed' && condition.operator) {
                const operatorText = OPERATOR_TEXT_MAP[condition.operator] || condition.operator;
                return `${columnLabel} ${operatorText} ${condition.value}`;
            } else if (condition.ruleType === 'text' && condition.conditionText) {
                return `${columnLabel} contains "${condition.conditionText}"`;
            }
            return '';
        }).filter(Boolean).join(` ${rule.logicalOperator} `);

        return `If (${conditionsString}), then recommend: "${rule.recommendationText}"`;
      }).filter(Boolean).join('\n');

      const result = await recommendRepairsForAllAssets({
        assets: assets,
        repairPrices: repairPrices,
        userDefinedRules: rulesString,
      });

      const recommendationsMap = new Map(
        result.recommendations.map((r) => [r.assetId, { recommendation: r.recommendation, estimatedCost: r.estimatedCost, needsPrice: r.needsPrice }])
      );

      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          const rec = recommendationsMap.get(asset.assetId);
          return rec ? {
            ...asset,
            recommendation: rec.recommendation,
            estimatedCost: rec.estimatedCost,
            needsPrice: rec.needsPrice,
          } : asset;
        })
      );

      toast({
        title: "Recommendations Generated",
        description: "AI recommendations have been added for all assets.",
      });

    } catch (error) {
      console.error(error);
       toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to generate recommendations. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddNewAsset = (values: z.infer<typeof newAssetSchema>) => {
    const assetTypePrefix = values.septicSystemType === 'Cistern' ? 'C' : 'S';
    
    const existingIds = assets
      .filter(asset => asset.assetId.startsWith(assetTypePrefix + '-'))
      .map(asset => parseInt(asset.assetId.split('-')[1], 10))
      .filter(num => !isNaN(num));

    const newIdNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const newAssetId = `${assetTypePrefix}-${String(newIdNumber).padStart(3, '0')}`;

    const newAsset: AssetWithRecommendation = {
      ...values,
      assetId: newAssetId,
      recommendation: undefined,
      estimatedCost: undefined,
      needsPrice: false,
    };
    setAssets(prev => [newAsset, ...prev]);
    toast({
        title: 'Asset Added',
        description: `Asset ${newAsset.assetId} has been successfully added.`,
    });
    setIsNewAssetDialogOpen(false);
    form.reset();
  }

  const handleDeleteAsset = (assetId: string) => {
    setAssets(prev => prev.filter(asset => asset.assetId !== assetId));
    toast({
        title: "Asset Deleted",
        description: `Asset ${assetId} has been successfully deleted.`,
    });
    setAssetToDelete(null);
  };


  const handleValueChange = (
    assetId: string,
    key: keyof Asset,
    value: string | number
  ) => {
    setAssets((prevAssets) =>
      prevAssets.map((asset) => {
        if (asset.assetId === assetId) {
          const updatedAsset = { ...asset, [key]: value };
          // If the system type changes, reset the sub-type
          if (key === 'septicSystemType') {
            updatedAsset.assetSubType = value === 'Cistern' ? 'Cistern' : 'Pump Out';
          }
          return updatedAsset;
        }
        return asset;
      })
    );
  };
  
  const handleResetData = () => {
    setAssets(initialAssets.map(d => ({ ...d, recommendation: undefined, estimatedCost: undefined, needsPrice: false })));
    setFilters([]);
    setSortConfig(null);
    toast({
        title: "Data Reset",
        description: "All asset data has been reset to its initial state.",
      });
  };

  const renderCellContent = (asset: AssetWithRecommendation, key: Column['key']) => {
    const cellId = `${asset.assetId}-${key}`;
    const isEditing = editingCell === cellId;

    if (key === 'actions') {
      return (
        <div className="flex items-center justify-end gap-2">
            <AlertDialog open={assetToDelete?.assetId === asset.assetId} onOpenChange={(isOpen) => !isOpen && setAssetToDelete(null)}>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setAssetToDelete(asset)}>
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete Asset</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete asset{' '}
                        <span className="font-bold">{assetToDelete?.assetId}</span>.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteAsset(assetToDelete!.assetId)}>
                        Yes, delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      );
    }
    
    const value = asset[key as keyof AssetWithRecommendation];

    if (isEditing) {
      if (key === 'septicSystemType') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.assetId, key as keyof Asset, newValue);
              setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cistern">Cistern</SelectItem>
              <SelectItem value="Septic Tank">Septic Tank</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      if (key === 'assetSubType' && asset.septicSystemType === 'Septic Tank') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.assetId, key as keyof Asset, newValue);
              setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pump Out">Pump Out</SelectItem>
              <SelectItem value="Mound">Mound</SelectItem>
              <SelectItem value="Septic Field">Septic Field</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      if (key === 'material') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.assetId, key as keyof Asset, newValue);
              setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Concrete">Concrete</SelectItem>
              <SelectItem value="Polyethylene">Polyethylene</SelectItem>
              <SelectItem value="Fibreglass">Fibreglass</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      if (key === 'fieldNotes' || key === 'recommendation') {
         return (
          <Textarea
            autoFocus
            defaultValue={value as string}
            onBlur={(e) => {
              handleValueChange(asset.assetId, key as keyof Asset, e.target.value);
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleValueChange(asset.assetId, key as keyof Asset, e.currentTarget.value);
                setEditingCell(null);
              }
            }}
            className="h-24"
          />
        );
      }
       if (asset.septicSystemType === 'Cistern' && key === 'assetSubType') {
        // Not editable if it's a Cistern
      } else {
        return (
          <Input
            autoFocus
            type={typeof value === 'number' ? 'number' : 'text'}
            defaultValue={value as string | number}
            onBlur={(e) => {
              const val = typeof value === 'number' ? Number(e.target.value) : e.target.value;
              handleValueChange(asset.assetId, key as keyof Asset, val);
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = typeof value === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value;
                handleValueChange(asset.assetId, key as keyof Asset, val);
                setEditingCell(null);
              }
            }}
            className="h-8"
          />
        );
      }
    }
     if (key === 'estimatedCost') {
      const cost = value as number;
      return (
        <span className="truncate">
          {cost !== undefined && cost !== null && cost > 0 ? `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </span>
      );
    }
    
    if (key === 'recommendation') {
      return (
        <div className="whitespace-pre-wrap">
          <span>{String(value ?? '')}</span>
          {asset.needsPrice && (
            <p className="text-xs text-destructive">
              Please add a price for this repair in the Price Configuration tool.
            </p>
          )}
        </div>
      );
    }
    
    if (key === 'fieldNotes') {
        return <span className="whitespace-pre-wrap">{String(value ?? '')}</span>;
    }

    return <span className="truncate">{String(value ?? '')}</span>;
  };

  const isCellEditable = (asset: AssetWithRecommendation, key: Column['key']) => {
    if (key === 'assetId' || key === 'recommendation' || key === 'estimatedCost' || key === 'actions') return false;
    if (key === 'assetSubType' && asset.septicSystemType === 'Cistern') return false;
    return true;
  }
  
  const renderFilterValueInput = () => {
    if (!currentFilter.column) return null;
    
    const columnType = ALL_COLUMNS.find(c => c.key === currentFilter.column?.key)?.type;

    if (columnType === 'enum' && currentFilter.column.options) {
      return (
        <Select value={currentFilter.value} onValueChange={(val) => setCurrentFilter(f => ({ ...f, value: val }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select value..."/>
          </SelectTrigger>
          <SelectContent>
            {currentFilter.column.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      )
    }

    return (
       <Input 
         type={columnType === 'number' ? 'number' : 'text'}
         placeholder="Enter value..."
         value={currentFilter.value || ''}
         onChange={(e) => setCurrentFilter(f => ({ ...f, value: e.target.value }))}
       />
    )
  }

  const handleApplySort = () => {
    setSortConfig({
      key: currentSort.key as keyof AssetWithRecommendation,
      direction: currentSort.direction
    });
    setSortPopoverOpen(false);
  }

  const requestSort = (key: keyof AssetWithRecommendation) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  return (
    <div className="flex flex-col h-full space-y-4">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filtered Assets</CardTitle>
                 {isClient ? (
                    <span className="text-muted-foreground">{processedAssets.length} / {assets.length}</span>
                ) : (
                    <Skeleton className="h-4 w-12" />
                )}
            </CardHeader>
            <CardContent>
                 {isClient ? (
                    <div className="text-2xl font-bold">
                        {processedAssets.length}
                    </div>
                ) : (
                    <Skeleton className="h-8 w-1/4" />
                )}
                 <p className="text-xs text-muted-foreground">
                    Assets matching current filters
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Repair Cost</CardTitle>
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isClient ? (
                    <div className="text-2xl font-bold">
                        ${totalRepairCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                ) : (
                    <Skeleton className="h-8 w-1/2" />
                )}
                <p className="text-xs text-muted-foreground">
                    Estimated cost for filtered assets
                </p>
            </CardContent>
        </Card>
      </div>
       <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleRunRecommendations} disabled={isGenerating || !isClient}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Run AI Recommendations
          </Button>
           <Dialog open={isNewAssetDialogOpen} onOpenChange={setIsNewAssetDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!isClient}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Asset</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddNewAsset)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Address</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="yearInstalled" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Year Installed</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="material" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Material</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Concrete">Concrete</SelectItem>
                                        <SelectItem value="Polyethylene">Polyethylene</SelectItem>
                                        <SelectItem value="Fibreglass">Fibreglass</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="septicSystemType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>System Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Cistern">Cistern</SelectItem>
                                        <SelectItem value="Septic Tank">Septic Tank</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="assetSubType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sub-Type</FormLabel>
                                 <Select onValueChange={field.onChange} value={field.value} disabled={septicSystemType === 'Cistern'}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                       {septicSystemType === 'Cistern' ? (
                                            <SelectItem value="Cistern">Cistern</SelectItem>
                                       ) : (
                                           <>
                                            <SelectItem value="Pump Out">Pump Out</SelectItem>
                                            <SelectItem value="Mound">Mound</SelectItem>
                                            <SelectItem value="Septic Field">Septic Field</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                           </>
                                       )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="setbackFromWaterSource" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Setback Water (m)</FormLabel>
                                <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="setbackFromHouse" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Setback House (m)</FormLabel>
                                <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="tankBuryDepth" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bury Depth (m)</FormLabel>
                                <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="openingSize" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Opening Size (m)</FormLabel>
                                <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="aboveGroundCollarHeight" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Collar Height (m)</FormLabel>
                                <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="siteCondition" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Site Condition (1-5)</FormLabel>
                                <FormControl><Input type="number" min="1" max="5" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="coverCondition" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cover Condition (1-5)</FormLabel>
                                <FormControl><Input type="number" min="1" max="5" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="collarCondition" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Collar Condition (1-5)</FormLabel>
                                <FormControl><Input type="number" min="1" max="5" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="interiorCondition" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Interior Condition (1-5)</FormLabel>
                                <FormControl><Input type="number" min="1" max="5" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="overallCondition" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Overall Condition (1-5)</FormLabel>
                                <FormControl><Input type="number" min="1" max="5" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="fieldNotes" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Field Notes</FormLabel>
                                <FormControl><Textarea {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <DialogFooter className="md:col-span-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Add Asset</Button>
                        </DialogFooter>
                    </form>
                </Form>
              </DialogContent>
           </Dialog>
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={!isClient}>
                <FilterIcon className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Add Filter</h4>
                  <p className="text-sm text-muted-foreground">
                    Create a filter to refine the data.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Column</Label>
                   <Select onValueChange={(val) => setCurrentFilter({ column: ALL_COLUMNS.find(c => c.key === val) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_COLUMNS.filter(c => c.type !== 'action' && c.key !== 'assetId').map(col => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                {currentFilter.column && (
                  <>
                    <div className="grid gap-2">
                      <Label>Operator</Label>
                      <Select value={currentFilter.operator} onValueChange={(val) => setCurrentFilter(f => ({...f, operator: val}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an operator"/>
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS[currentFilter.column!.type as 'string' | 'number' | 'enum'].map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Value</Label>
                      {renderFilterValueInput()}
                    </div>
                  </>
                )}
                <Button onClick={handleAddFilter} disabled={!currentFilter.column || !currentFilter.operator || currentFilter.value === undefined || currentFilter.value === ''}>Add Filter</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={!isClient}>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Sort By</h4>
                  <p className="text-sm text-muted-foreground">
                    Select a column and direction to sort the data.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Column</Label>
                   <Select value={currentSort.key} onValueChange={(val) => setCurrentSort(s => ({...s, key: val}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_COLUMNS.filter(c => c.type !== 'action').map(col => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <Label>Direction</Label>
                    <RadioGroup 
                        defaultValue={currentSort.direction} 
                        onValueChange={(val: 'ascending' | 'descending') => setCurrentSort(s => ({ ...s, direction: val }))}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ascending" id="ascending" />
                            <Label htmlFor="ascending">Ascending</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="descending" id="descending" />
                            <Label htmlFor="descending">Descending</Label>
                        </div>
                    </RadioGroup>
                 </div>
                <Button onClick={handleApplySort}>Apply Sort</Button>
                {sortConfig && <Button variant="ghost" onClick={() => setSortConfig(null)}>Clear Sort</Button>}
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!isClient}>
                <View className="mr-2 h-4 w-4" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_COLUMNS.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={columnVisibility[column.key]}
                  onCheckedChange={(value) =>
                    setColumnVisibility((prev) => ({ ...prev, [column.key]: value }))
                  }
                  disabled={column.key === 'assetId'}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-4">
           <Button variant="ghost" onClick={handleResetData} disabled={!isClient}>
             <RotateCcw className="mr-2 h-4 w-4" />
             Reset Data
           </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
          {filters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Active Filters:</span>
              {filters.map(filter => {
                 const column = ALL_COLUMNS.find(c => c.key === filter.column);
                 if (!column) return null;
                 const operator = OPERATORS[column.type as 'string' | 'number' | 'enum']?.find(o => o.value === filter.operator);
                 return (
                  <Badge key={filter.id} variant="secondary" className="pl-2 pr-1">
                    {column?.label} {operator?.label.toLowerCase()} "{filter.value}"
                    <button onClick={() => removeFilter(filter.id)} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove filter</span>
                    </button>
                  </Badge>
                )
              })}
              <Button variant="ghost" size="icon" onClick={() => setFilters([])} className="h-6 w-6">
                <X className="h-4 w-4" />
                <span className="sr-only">Clear all filters</span>
              </Button>
            </div>
          )}
      </div>
      <ScrollArea className="flex-grow border rounded-lg">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              {visibleColumns.map((header) => (
                <TableHead key={header.key} style={{ width: header.width }} className={header.type !== 'action' ? 'cursor-pointer' : ''} onClick={() => header.type !== 'action' && requestSort(header.key as keyof AssetWithRecommendation)}>
                  <div className="flex items-center gap-2">
                    {header.label}
                    {isClient && sortConfig?.key === header.key && (
                       sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isClient ? processedAssets.map((asset) => (
              <TableRow key={asset.assetId}>
                {visibleColumns.map((header) => (
                  <TableCell
                    key={header.key}
                    onClick={() => isClient && isCellEditable(asset, header.key) && setEditingCell(`${asset.assetId}-${header.key}`)}
                    className={cn(
                      isClient && isCellEditable(asset, header.key) ? 'cursor-pointer' : '',
                      'whitespace-pre-wrap'
                    )}
                  >
                    {renderCellContent(asset, header.key)}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                      {visibleColumns.map(header => (
                          <TableCell key={header.key}>
                              <Skeleton className="h-6 w-full" />
                          </TableCell>
                      ))}
                  </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

  