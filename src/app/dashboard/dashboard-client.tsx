
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { Asset, RepairPrice } from '@/lib/data';
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
import { Wand2, Loader2, View, Filter as FilterIcon, X, CircleDollarSign, Plus, Trash, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, Save, PlusCircle } from 'lucide-react';
import { recommendRepairsForAllAssets, generateCostsForRecommendations } from '@/app/actions';
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
  DialogDescription,
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
import type { Rule, Condition } from '@/app/rules/rules-client';
import { ASSET_COLUMNS, OPERATORS } from '@/app/rules/rules-client';
import { PageHeader } from '@/components/page-header';
import { ProjectSwitcher } from '@/components/project-switcher';
import { useProjects } from '@/hooks/use-projects';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type CostBreakdownItem = {
  repairType: string;
  unitPrice: number;
};

type AssetWithRecommendation = Omit<Asset, 'yearInstalled' | 'setbackFromWaterSource' | 'setbackFromHouse' | 'tankBuryDepth' | 'openingSize' | 'aboveGroundCollarHeight' | 'siteCondition' | 'coverCondition' | 'collarCondition' | 'interiorCondition' | 'overallCondition'> & { 
  yearInstalled: number | string;
  abandoned: 'Yes' | 'No';
  setbackFromWaterSource: number | string;
  setbackFromHouse: number | string;
  tankBuryDepth: number | string;
  openingSize: number | string;
  aboveGroundCollarHeight: number | string;
  siteCondition: number | string;
  coverCondition: number | string;
  collarCondition: number | string;
  interiorCondition: number | string;
  overallCondition: number | string;
  recommendation?: string[];
  userRecommendation?: string[];
  aiEstimatedCost?: number;
  userVerifiedCost?: number;
  needsPrice?: boolean;
  estimatedRemainingLife?: string;
  costBreakdown?: CostBreakdownItem[];
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
    { key: 'yearInstalled', label: 'Year Installed', type: 'string', width: '120px' },
    { key: 'material', label: 'Material', type: 'enum', options: ['Concrete', 'Polyethylene', 'Fibreglass'], width: '120px' },
    { key: 'systemType', label: 'System Type', type: 'enum', options: ['Cistern', 'Septic Tank'], width: '120px' },
    { key: 'assetSubType', label: 'Sub-Type', type: 'enum', options: ['Cistern', 'Pump Out', 'Mound', 'Septic Field', 'Other', 'Unknown'], width: '120px' },
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
    { key: 'abandoned', label: 'Abandoned / Not in Use?', type: 'enum', options: ['Yes', 'No'], width: '150px' },
    { key: 'fieldNotes', label: 'Field Notes', type: 'string', width: '300px' },
    { key: 'estimatedRemainingLife', label: 'Est. Remaining Life', type: 'string', width: '150px' },
    { key: 'recommendation', label: 'AI Recommendation', type: 'string', width: '300px' },
    { key: 'userRecommendation', label: 'User Recommendation', type: 'string', width: '300px' },
    { key: 'aiEstimatedCost', label: 'AI Est. Cost', type: 'number', width: '120px' },
    { key: 'userVerifiedCost', label: 'User Verified Cost', type: 'number', width: '140px' },
    { key: 'actions', label: 'Actions', type: 'action', width: '100px' },
];

const EXPORT_COLUMNS: (keyof AssetWithRecommendation)[] = [
  'assetId',
  'address',
  'yearInstalled',
  'material',
  'systemType',
  'assetSubType',
  'setbackFromWaterSource',
  'setbackFromHouse',
  'tankBuryDepth',
  'openingSize',
  'aboveGroundCollarHeight',
  'siteCondition',
  'coverCondition',
  'collarCondition',
  'interiorCondition',
  'overallCondition',
  'abandoned',
  'fieldNotes',
  'estimatedRemainingLife',
  'recommendation',
  'userRecommendation',
  'aiEstimatedCost',
  'userVerifiedCost',
];

const OPERATOR_TEXT_MAP: Record<string, string> = {
  contains: 'contains',
  equals: 'is equal to',
  not_contains: 'does not contain',
  not_equals: 'is not equal to',
  eq: 'is',
  neq: 'is not',
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
  yearInstalled: z.string().refine(val => {
    if (val.toLowerCase() === 'unknown') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 1900 && num <= new Date().getFullYear();
  }, 'Must be "Unknown" or a year between 1900 and the current year.'),
  material: z.enum(['Concrete', 'Polyethylene', 'Fibreglass']),
  setbackFromWaterSource: z.coerce.number().min(0),
  setbackFromHouse: z.coerce.number().min(0),
  tankBuryDepth: z.coerce.number().min(0),
  openingSize: z.coerce.number().min(0),
  aboveGroundCollarHeight: z.coerce.number().min(0),
  systemType: z.enum(['Cistern', 'Septic Tank']),
  assetSubType: z.enum(['Cistern', 'Pump Out', 'Mound', 'Septic Field', 'Other', 'Unknown']),
  siteCondition: z.coerce.number().min(1, "Must be between 1 and 5").max(5, "Must be between 1 and 5"),
  coverCondition: z.coerce.number().min(1, "Must be between 1 and 5").max(5, "Must be between 1 and 5"),
  collarCondition: z.coerce.number().min(1, "Must be between 1 and 5").max(5, "Must be between 1 and 5"),
  interiorCondition: z.coerce.number().min(1, "Must be between 1 and 5").max(5, "Must be between 1 and 5"),
  overallCondition: z.coerce.number().min(1, "Must be between 1 and 5").max(5, "Must be between 1 and 5"),
  abandoned: z.enum(['Yes', 'No']),
  fieldNotes: z.string().optional(),
}).refine(data => {
    if (data.systemType === 'Cistern' && data.assetSubType !== 'Cistern') {
        return false;
    }
    return true;
}, {
    message: "Sub-type must be 'Cistern' if system type is 'Cistern'",
    path: ['assetSubType'],
});

const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  assetId: true,
  address: true,
  yearInstalled: true,
  material: true,
  systemType: true,
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
  abandoned: true,
  fieldNotes: true,
  estimatedRemainingLife: true,
  recommendation: true,
  userRecommendation: true,
  aiEstimatedCost: true,
  userVerifiedCost: true,
  actions: true,
};

const REQUIRED_UPLOAD_COLUMNS: (keyof Asset)[] = [
  'assetId', 'address', 'yearInstalled', 'material', 'setbackFromWaterSource',
  'setbackFromHouse', 'tankBuryDepth', 'openingSize', 'aboveGroundCollarHeight',
  'systemType', 'assetSubType', 'siteCondition', 'coverCondition',
  'collarCondition', 'interiorCondition', 'overallCondition', 'abandoned', 'fieldNotes'
];


export function DashboardClient() {
  const projectsHook = useProjects();
  const { 
    assets, setAssets, 
    repairPrices, 
    rules, 
    isReady, 
    activeProject, 
    updateCurrentProject, 
    saveProject,
    deleteProject 
  } = projectsHook;
  const [editingCell, setEditingCell] = useState<string | null>(null); // 'rowId-colKey'
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCosts, setIsGeneratingCosts] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isNewAssetDialogOpen, setIsNewAssetDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetWithRecommendation | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSaveAsDialogOpen, setIsSaveAsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadInfoDialogOpen, setIsUploadInfoDialogOpen] = useState(false);
  const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof newAssetSchema>>({
    resolver: zodResolver(newAssetSchema),
    defaultValues: {
      address: '',
      yearInstalled: String(new Date().getFullYear()),
      material: 'Concrete',
      setbackFromWaterSource: 0,
      setbackFromHouse: 0,
      tankBuryDepth: 0,
      openingSize: 0,
      aboveGroundCollarHeight: 0,
      systemType: 'Septic Tank',
      assetSubType: 'Pump Out',
      siteCondition: 5,
      coverCondition: 5,
      collarCondition: 5,
      interiorCondition: 5,
      overallCondition: 5,
      abandoned: 'No',
      fieldNotes: '',
    },
  });
  
  const systemType = form.watch('systemType');

  useEffect(() => {
    if (systemType === 'Cistern') {
      form.setValue('assetSubType', 'Cistern');
    }
  }, [systemType, form]);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const [columnVisibility, setColumnVisibility] = useLocalStorage<
    Record<string, boolean>
  >('columnVisibility', DEFAULT_COLUMN_VISIBILITY);

  const [filters, setFilters] = useLocalStorage<Filter[]>('assetFilters', []);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<{column?: Column, operator?: string, value?: string}>({});
  
  const [sortConfig, setSortConfig] = useLocalStorage<SortConfig | null>('assetSortConfig', null);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<{key: string, direction: 'ascending' | 'descending'}>(sortConfig ? {key: sortConfig.key, direction: sortConfig.direction} : { key: 'assetId', direction: 'ascending' });

  
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
  
  const { processedAssets, visibleColumns } = useMemo(() => {
    const visibility = isClient ? columnVisibility : DEFAULT_COLUMN_VISIBILITY;
    const currentVisibleColumns = ALL_COLUMNS.filter(
      (column) => visibility[column.key]
    );

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
                if (filter.operator === 'equals' || filter.operator === 'eq') return strValue === filterStrValue;
                if (filter.operator === 'not_contains') return !strValue.includes(filterStrValue);
                if (filter.operator === 'not_equals' || filter.operator === 'neq') return strValue !== filterStrValue;
                break;
              case 'number':
                const numValue = Number(assetValue);
                const filterNumValue = Number(filter.value);
                if (isNaN(numValue)) return false;
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

    return { processedAssets: assetsToProcess, visibleColumns: currentVisibleColumns };
  }, [isClient, assets, filters, sortConfig, columnVisibility]);
  
  const totalRepairCost = useMemo(() => {
    return processedAssets.reduce((total, asset) => {
        const cost = asset.userVerifiedCost;
        if (typeof cost === 'number' && !isNaN(cost)) {
            return total + cost;
        }
        return total;
    }, 0);
  }, [processedAssets]);


  const createRuleString = (rule: Rule) => {
    if (!rule.conditions || rule.conditions.length === 0) return '';
    const conditionsString = rule.conditions.map((condition: Condition) => {
        const columnDef = ASSET_COLUMNS.find(c => c.key === condition.column);
        if (!columnDef) return null; // Skip if column not found
        
        const columnLabel = columnDef.label;
        const operatorText = condition.operator ? OPERATOR_TEXT_MAP[condition.operator] : '';

        if (columnDef.type === 'string' && condition.conditionText) {
            return `${columnLabel} ${operatorText} "${condition.conditionText}"`;
        }

        if ((columnDef.type === 'number' || columnDef.type === 'enum' || columnDef.key === 'yearInstalled') && condition.value !== undefined) {
              if (operatorText) {
                return `${columnLabel} ${operatorText} "${condition.value}"`;
            }
        }

        return null; // Should not happen with validation
    }).filter(Boolean).join(` ${rule.logicalOperator} `);
    
    if (!conditionsString) return '';

    const outcome = rule.ruleType === 'REPAIR' 
        ? `then recommend: "${rule.recommendationText}"` 
        : `then remaining life is: "${rule.lifeExpectancy}"`;

    return `If (${conditionsString}), ${outcome}`;
  };

  const handleRunRecommendations = async () => {
    setIsGenerating(true);
    try {
      const rulesString = rules.map(createRuleString).filter(Boolean).join('\n');
      
      const result = await recommendRepairsForAllAssets({
        assets: assets.map(a => ({...a, yearInstalled: String(a.yearInstalled || 'Unknown')})),
        rules: rulesString,
      });

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
            toast({
                variant: 'destructive',
                title: `Asset ${error.assetId} Failed`,
                description: `Could not generate recommendation: ${error.message}`,
            });
        });
      }

      const recommendationsMap = new Map(
        result.recommendations.map((r) => [r.assetId, { 
            recommendation: r.recommendation, 
            estimatedRemainingLife: r.estimatedRemainingLife,
        }])
      );

      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          const rec = recommendationsMap.get(asset.assetId);
          if (rec) {
            return {
              ...asset,
              recommendation: rec.recommendation,
              estimatedRemainingLife: rec.estimatedRemainingLife,
              // Preserve existing user recommendation
              aiEstimatedCost: undefined,
              userVerifiedCost: undefined,
              needsPrice: false,
              costBreakdown: [],
            };
          }
          return asset;
        })
      );
      
      const successCount = result.recommendations.length;
      if (successCount > 0 && (!result.errors || result.errors.length === 0)) {
        toast({
            title: "Recommendations Generated",
            description: `Successfully generated recommendations for ${successCount} asset(s).`,
        });
      }


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
  
  const handleRunSingleRecommendation = async (asset: AssetWithRecommendation) => {
    setGeneratingAssetId(asset.assetId);
    try {
        const rulesString = rules.map(createRuleString).filter(Boolean).join('\n');
        
        const result = await recommendRepairsForAllAssets({
            assets: [asset],
            rules: rulesString,
        });

        if (result.errors && result.errors.length > 0) {
            result.errors.forEach(error => {
                toast({
                    variant: 'destructive',
                    title: `Asset ${error.assetId} Failed`,
                    description: `Could not generate recommendation: ${error.message}`,
                });
            });
        }

        if (result.recommendations && result.recommendations.length > 0) {
            const rec = result.recommendations[0];
            setAssets(prevAssets => 
                prevAssets.map(a => 
                    a.assetId === rec.assetId 
                    ? { 
                        ...a, 
                        recommendation: rec.recommendation, 
                        estimatedRemainingLife: rec.estimatedRemainingLife,
                        aiEstimatedCost: undefined,
                        userVerifiedCost: undefined,
                        needsPrice: false,
                        costBreakdown: [],
                      } 
                    : a
                )
            );
            toast({
                title: "Recommendation Generated",
                description: `Successfully generated recommendation for asset ${rec.assetId}.`,
            });
        }
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: `Asset ${asset.assetId} Failed`,
            description: "An unexpected error occurred while generating the recommendation.",
        });
    } finally {
        setGeneratingAssetId(null);
    }
  };

  const handleGenerateCosts = async () => {
    setIsGeneratingCosts(true);
    try {
      const assetsForCosting = assets.map(asset => ({
        assetId: asset.assetId,
        userRecommendation: asset.userRecommendation || [],
      }));

      const result = await generateCostsForRecommendations({
        assets: assetsForCosting,
        repairPrices: repairPrices,
      });

      const costsMap = new Map(
        result.costs.map((c) => [c.assetId, {
          aiEstimatedCost: c.estimatedCost,
          needsPrice: c.needsPrice,
          costBreakdown: c.costBreakdown,
        }])
      );

      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          const costInfo = costsMap.get(asset.assetId);
          if (costInfo) {
            return { 
                ...asset, 
                aiEstimatedCost: costInfo.aiEstimatedCost,
                needsPrice: costInfo.needsPrice,
                costBreakdown: costInfo.costBreakdown,
            };
          }
          return asset;
        })
      );

      toast({
        title: "Costs Generated",
        description: "Estimated costs have been calculated based on user recommendations.",
      });

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to generate costs. Please try again.",
      });
    } finally {
      setIsGeneratingCosts(false);
    }
  };


  const handleAddNewAsset = (values: z.infer<typeof newAssetSchema>) => {
    const assetTypePrefix = values.systemType === 'Cistern' ? 'C' : 'S';
    
    const existingIds = assets
      .filter(asset => asset.assetId.startsWith(assetTypePrefix + '-'))
      .map(asset => parseInt(asset.assetId.split('-')[1], 10))
      .filter(num => !isNaN(num));

    const newIdNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const newAssetId = `${assetTypePrefix}-${String(newIdNumber).padStart(3, '0')}`;

    const newAsset: AssetWithRecommendation = {
      ...values,
      yearInstalled: values.yearInstalled.toLowerCase() === 'unknown' ? 'Unknown' : String(values.yearInstalled),
      assetId: newAssetId,
      recommendation: undefined,
      userRecommendation: undefined,
      aiEstimatedCost: undefined,
      userVerifiedCost: undefined,
      needsPrice: false,
      estimatedRemainingLife: undefined,
      costBreakdown: [],
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

  const handleDeleteAllAssets = () => {
    setAssets([]);
    toast({
        title: "All Assets Deleted",
        description: `The asset list has been cleared.`,
    });
    setIsDeleteAllDialogOpen(false);
  }

  const handleUpdateCurrentProject = () => {
    if (activeProject && activeProject.id !== 'default') {
      updateCurrentProject();
      toast({
        title: 'Project Saved',
        description: `Your changes to "${activeProject?.name}" have been saved.`,
      });
      setIsSaveDialogOpen(false);
    }
  }

  const handleSaveAsNewProject = () => {
    if (!newProjectName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Name',
        description: 'Project name cannot be empty.',
      });
      return;
    }
    saveProject(newProjectName);
    toast({
      title: 'Project Saved',
      description: `Your work has been saved as "${newProjectName}".`,
    });
    setNewProjectName('');
    setIsSaveAsDialogOpen(false);
    setIsSaveDialogOpen(false);
  };


  const handleValueChange = (
    assetId: string,
    key: keyof AssetWithRecommendation,
    value: string | number | string[]
  ) => {
    const isConditionField = ['siteCondition', 'coverCondition', 'collarCondition', 'interiorCondition', 'overallCondition'].includes(key);

    if (isConditionField && typeof value === 'number') {
      const numValue = Number(value);
      if (numValue < 1 || numValue > 5) {
        toast({
            variant: "destructive",
            title: "Invalid Value",
            description: `Condition scores must be between 1 and 5.`,
        });
        return;
      }
    }


    setAssets((prevAssets) =>
      prevAssets.map((asset) => {
        if (asset.assetId === assetId) {
          const updatedAsset = { ...asset, [key]: value };
          // If the system type changes, reset the sub-type
          if (key === 'systemType') {
            updatedAsset.assetSubType = value === 'Cistern' ? 'Cistern' : 'Pump Out';
          }
          if (key === 'userVerifiedCost' && typeof value === 'string') {
            updatedAsset.userVerifiedCost = parseFloat(value) || undefined;
          }
           if (key === 'yearInstalled') {
            const numVal = Number(value);
            updatedAsset.yearInstalled = isNaN(numVal) ? String(value) : numVal;
          }
          return updatedAsset;
        }
        return asset;
      })
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const processData = (data: any[]) => {
      try {
        if (!data || data.length === 0) {
            throw new Error("The file is empty or formatted incorrectly.");
        }
        const headers = Object.keys(data[0] || {});
        const missingHeaders = REQUIRED_UPLOAD_COLUMNS.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
        }
        
        const parseNumericalValue = (value: any): number | string => {
            const num = Number(value);
            if (value === null || value === undefined || String(value).trim() === '' || isNaN(num)) {
                return "N/A";
            }
            return parseFloat(num.toFixed(2));
        };
        
        const parseConditionValue = (value: any): number | string => {
            const num = Number(value);
            if (value === null || value === undefined || String(value).trim() === '' || isNaN(num)) {
                return "N/A";
            }
            return num;
        };

        const newAssets = data.map((row: any, index: number): AssetWithRecommendation | null => {
          if (!row.assetId) {
            console.warn(`Skipping row ${index + 2} due to missing assetId.`);
            return null;
          }
          
          const yearInstalledRaw = row.yearInstalled;
          let yearInstalled: string;
          if (yearInstalledRaw === null || yearInstalledRaw === undefined || String(yearInstalledRaw).trim() === '') {
            yearInstalled = 'Unknown';
          } else {
             yearInstalled = String(yearInstalledRaw);
          }
          
          const asset: Partial<AssetWithRecommendation> = {
              assetId: String(row.assetId),
              address: String(row.address ?? ''),
              yearInstalled: yearInstalled,
              material: ['Concrete', 'Polyethylene', 'Fibreglass'].includes(row.material) ? row.material : 'Concrete',
              setbackFromWaterSource: parseNumericalValue(row.setbackFromWaterSource),
              setbackFromHouse: parseNumericalValue(row.setbackFromHouse),
              tankBuryDepth: parseNumericalValue(row.tankBuryDepth),
              openingSize: parseNumericalValue(row.openingSize),
              aboveGroundCollarHeight: parseNumericalValue(row.aboveGroundCollarHeight),
              systemType: ['Cistern', 'Septic Tank'].includes(row.systemType) ? row.systemType : 'Septic Tank',
              assetSubType: ['Cistern', 'Pump Out', 'Mound', 'Septic Field', 'Other', 'Unknown'].includes(row.assetSubType) ? row.assetSubType : 'Other',
              siteCondition: parseConditionValue(row.siteCondition),
              coverCondition: parseConditionValue(row.coverCondition),
              collarCondition: parseConditionValue(row.collarCondition),
              interiorCondition: parseConditionValue(row.interiorCondition),
              overallCondition: parseConditionValue(row.overallCondition),
              abandoned: String(row.abandoned ?? '').trim().toLowerCase() === 'yes' ? 'Yes' : 'No',
              fieldNotes: String(row.fieldNotes ?? ''),
              recommendation: undefined,
              aiEstimatedCost: undefined,
              needsPrice: false,
              estimatedRemainingLife: undefined,
              costBreakdown: [],
          };
          
          // Optionally add user recommendations and costs
          if (row.userRecommendation) {
              asset.userRecommendation = String(row.userRecommendation).split(',').map(s => s.trim()).filter(Boolean);
          } else {
              asset.userRecommendation = undefined;
          }

          if (row.userVerifiedCost) {
              const cost = parseFloat(row.userVerifiedCost);
              asset.userVerifiedCost = isNaN(cost) ? undefined : cost;
          } else {
              asset.userVerifiedCost = undefined;
          }

           return asset as AssetWithRecommendation;
        }).filter((asset): asset is AssetWithRecommendation => asset !== null);

        if (newAssets.length === 0) {
            throw new Error("No valid assets could be loaded from the file. Please check asset IDs.");
        }

        setAssets(newAssets);
        toast({
          title: "Upload Successful",
          description: `${newAssets.length} assets have been loaded from the file.`,
        });
      } catch (error: any) {
        console.error("Data Processing Error:", error);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error.message || "Could not process the file. Please check the format and try again.",
        });
      }
    }

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processData(results.data),
        error: (error: any) => {
          console.error("CSV Reading Error:", error);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "An error occurred while reading the CSV file.",
          });
        },
      });
    } else if (file.name.endsWith('.xlsx')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            processData(jsonData);
          } catch (error: any) {
            console.error("Excel Reading Error:", error);
            toast({
              variant: "destructive",
              title: "Upload Failed",
              description: "An error occurred while reading the Excel file.",
            });
          }
        };
        reader.onerror = (error) => {
            console.error("File Reader Error:", error);
            toast({
              variant: "destructive",
              title: "Upload Failed",
              description: "Could not read the file.",
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
       toast({
          variant: "destructive",
          title: "Unsupported File Type",
          description: "Please upload a .csv or .xlsx file.",
        });
    }
    
    // Reset file input to allow re-uploading the same file
    if (event.target) {
        event.target.value = '';
    }
  };


  const handleExportData = () => {
    // 1. Prepare Asset Data in the correct order and format
    const assetExportData = processedAssets.map(asset => {
        const orderedAsset: Record<string, any> = {};
        EXPORT_COLUMNS.forEach(key => {
            const colDef = ALL_COLUMNS.find(c => c.key === key);
            if (colDef) {
                 const value = asset[colDef.key as keyof AssetWithRecommendation];
                 if (Array.isArray(value)) {
                    orderedAsset[colDef.key] = value.join(', ');
                } else {
                    orderedAsset[colDef.key] = value;
                }
            }
        });
        return orderedAsset;
    });

    // 2. Prepare Rules Data
    const rulesExportData = rules.map(rule => {
        return {
            'Rule ID': rule.id,
            'Rule Description': createRuleString(rule),
        }
    });

    // 3. Prepare Pricing Data (already flat)
    const pricingExportData = repairPrices.map(price => ({
        'Repair Type': price.repairType,
        'Unit Price': price.unitPrice,
        'Description': price.description,
    }));
    
    // 4. Create worksheets
    const assetWorksheet = XLSX.utils.json_to_sheet(assetExportData);
    const rulesWorksheet = XLSX.utils.json_to_sheet(rulesExportData);
    const pricingWorksheet = XLSX.utils.json_to_sheet(pricingExportData);

    // 5. Create workbook and append sheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, assetWorksheet, 'Asset Data');
    XLSX.utils.book_append_sheet(workbook, rulesWorksheet, 'Configured Rules');
    XLSX.utils.book_append_sheet(workbook, pricingWorksheet, 'Unit Pricing');

    // 6. Write file and trigger download
    XLSX.writeFile(workbook, 'project_export.xlsx');

    toast({
        title: "Export Successful",
        description: "Your project data has been exported to project_export.xlsx.",
    });
  };

  const renderCellContent = (asset: AssetWithRecommendation, key: Column['key']) => {
    const cellId = `${asset.assetId}-${key}`;
    const isEditing = editingCell === cellId;

    if (key === 'actions') {
      return (
        <div className="flex items-center justify-end gap-2">
            <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleRunSingleRecommendation(asset)}
                disabled={isGenerating || generatingAssetId === asset.assetId}
                title="Run AI Recommendation"
            >
                {generatingAssetId === asset.assetId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                <span className="sr-only">Run AI Recommendation</span>
            </Button>
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
      if (key === 'abandoned') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.assetId, key as keyof AssetWithRecommendation, newValue);
              setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      if (key === 'systemType') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.assetId, key as keyof AssetWithRecommendation, newValue);
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
      if (key === 'assetSubType' && asset.systemType === 'Septic Tank') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.assetId, key as keyof AssetWithRecommendation, newValue);
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
              <SelectItem value="Unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      if (key === 'material') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.assetId, key as keyof AssetWithRecommendation, newValue);
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
      if (key === 'fieldNotes' || key === 'recommendation' || key === 'userRecommendation' || key === 'estimatedRemainingLife') {
         return (
          <Textarea
            autoFocus
            defaultValue={Array.isArray(value) ? value.join(', ') : (value as string)}
            onBlur={(e) => {
              const updatedValue = (key === 'recommendation' || key === 'userRecommendation') ? e.target.value.split(',').map(s => s.trim()) : e.target.value;
              handleValueChange(asset.assetId, key as keyof AssetWithRecommendation, updatedValue);
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                const updatedValue = (key === 'recommendation' || key === 'userRecommendation') ? e.currentTarget.value.split(',').map(s => s.trim()) : e.currentTarget.value;
                handleValueChange(asset.assetId, key as keyof AssetWithRecommendation, updatedValue);
                setEditingCell(null);
              }
            }}
            className="h-24"
          />
        );
      }
       if (asset.systemType === 'Cistern' && key === 'assetSubType') {
        // Not editable if it's a Cistern
      } else {
        const isConditionField = ['siteCondition', 'coverCondition', 'collarCondition', 'interiorCondition', 'overallCondition'].includes(key);
        const inputType = (key === 'yearInstalled' || typeof value === 'string') ? 'text' : 'number';
        return (
          <Input
            autoFocus
            type={inputType}
            defaultValue={value as string | number}
            max={isConditionField ? 5 : undefined}
            min={isConditionField ? 1 : undefined}
            onBlur={(e) => {
              const val = (typeof value === 'number' && key !== 'yearInstalled' && typeof value !== 'string') ? parseFloat(e.target.value) : e.target.value;
              handleValueChange(asset.assetId, key as keyof AssetWithRecommendation, val);
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (typeof value === 'number' && key !== 'yearInstalled' && typeof value !== 'string') ? parseFloat(e.currentTarget.value) : e.currentTarget.value;
                handleValueChange(asset.assetId, key as keyof AssetWithRecommendation, val);
                setEditingCell(null);
              }
            }}
            className="h-8"
          />
        );
      }
    }
     if (key === 'aiEstimatedCost') {
      const cost = value as number;
      const breakdown = asset.costBreakdown || [];

      if (cost === undefined || cost === null) {
        return <span>-</span>
      }
      
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="link" className="p-0 h-auto font-normal text-foreground">
              ${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Cost Breakdown</h4>
                <p className="text-sm text-muted-foreground">
                  The following repairs were used to calculate the total cost.
                </p>
              </div>
              <div className="grid gap-2">
                {breakdown.length > 0 ? (
                  breakdown.map((item, index) => (
                    <div key={index} className="grid grid-cols-3 items-center gap-4 text-sm">
                      <span className="col-span-2 truncate">{item.repairType}</span>
                       <span className="text-right font-medium">
                        ${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No priced repairs found.</p>
                )}
                 {asset.needsPrice && (
                  <p className="text-xs text-destructive mt-2">
                    One or more recommended repairs requires a price in the Price Configuration tool.
                  </p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    if (key === 'userVerifiedCost') {
      const cost = value as number;
      if (cost === undefined || cost === null || isNaN(cost)) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span>${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    }
    
    if (key === 'recommendation' || key === 'userRecommendation') {
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');
      return (
        <div className="whitespace-pre-wrap">
          <span>{displayValue}</span>
        </div>
      );
    }
    
    if (key === 'fieldNotes' || key === 'estimatedRemainingLife' || key === 'yearInstalled') {
        return <span className="whitespace-pre-wrap">{String(value ?? '')}</span>;
    }

    return <span className="truncate">{String(value ?? '')}</span>;
  };

  const isCellEditable = (asset: AssetWithRecommendation, key: Column['key']) => {
    if (key === 'assetId' || key === 'aiEstimatedCost' || key === 'actions' || key === 'recommendation') return false;
    // if (key === 'recommendation' || key === 'estimatedRemainingLife') return false;
    if (key === 'assetSubType' && asset.systemType === 'Cistern') return false;
    return true;
  }
  
  const renderFilterValueInput = () => {
    if (!currentFilter.column) return null;
    
    const columnType = ALL_COLUMNS.find(c => c.key === currentFilter.column?.key)?.type;
    const key = currentFilter.column?.key;

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
         type={columnType === 'number' && key !== 'yearInstalled' ? 'number' : 'text'}
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
    <div className="flex flex-col h-full space-y-4 p-4">
        <PageHeader
            title="Asset Dashboard"
            description="View, edit, and analyze asset data with AI-powered recommendations."
        >
            <ProjectSwitcher 
              projectsHook={projectsHook}
              handleUpdateCurrentProject={handleUpdateCurrentProject}
              handleSaveAsNewProject={handleSaveAsNewProject}
              isSaveDialogOpen={isSaveDialogOpen}
              setIsSaveDialogOpen={setIsSaveDialogOpen}
              isSaveAsDialogOpen={isSaveAsDialogOpen}
              setIsSaveAsDialogOpen={setIsSaveAsDialogOpen}
              newProjectName={newProjectName}
              setNewProjectName={setNewProjectName}
            />
             <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".csv,.xlsx"
            />
            <Dialog open={isUploadInfoDialogOpen} onOpenChange={setIsUploadInfoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Data Upload Instructions</DialogTitle>
                  <DialogDescription>
                    To ensure a successful upload, please make sure your CSV or Excel file contains the following columns with the exact names listed below. The order of columns does not matter.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <h4 className="font-semibold mb-2">Required Columns:</h4>
                  <ul className="grid grid-cols-2 gap-x-8 gap-y-1 list-disc list-inside text-sm text-muted-foreground bg-muted p-4 rounded-md">
                    {REQUIRED_UPLOAD_COLUMNS.map(col => <li key={col}><code className="font-mono">{col}</code></li>)}
                  </ul>
                  <h4 className="font-semibold mt-4 mb-2">Optional Columns:</h4>
                   <ul className="grid grid-cols-2 gap-x-8 gap-y-1 list-disc list-inside text-sm text-muted-foreground bg-muted p-4 rounded-md">
                    <li><code className="font-mono">userRecommendation</code></li>
                    <li><code className="font-mono">userVerifiedCost</code></li>
                  </ul>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadInfoDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    fileInputRef.current?.click();
                    setIsUploadInfoDialogOpen(false);
                  }}>
                    Proceed to Upload
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleExportData}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete All Assets
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all
                        asset data for the current project.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllAssets}>
                        Yes, delete all
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageHeader>
        <div className="flex-1 p-6 pt-0 bg-card rounded-b-lg flex flex-col space-y-4">
        <div className="relative overflow-hidden flex flex-col space-y-4 h-full">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filtered Assets</CardTitle>
                 {isReady ? (
                    <span className="text-muted-foreground">{processedAssets.length} / {assets.length}</span>
                ) : (
                    <Skeleton className="h-4 w-12" />
                )}
            </CardHeader>
            <CardContent>
                 {isReady ? (
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
                {isReady ? (
                    <div className="text-2xl font-bold">
                        ${totalRepairCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                ) : (
                    <Skeleton className="h-8 w-1/2" />
                )}
                <p className="text-xs text-muted-foreground">
                    User-verified costs for filtered assets
                </p>
            </CardContent>
        </Card>
      </div>
       <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleRunRecommendations} disabled={isGenerating || isGeneratingCosts || !isReady}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Run AI Recommendations
          </Button>
          <Button onClick={handleGenerateCosts} disabled={isGenerating || isGeneratingCosts || !isReady}>
            {isGeneratingCosts ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CircleDollarSign className="mr-2 h-4 w-4" />
            )}
            Generate Costs
          </Button>
           <Dialog open={isNewAssetDialogOpen} onOpenChange={setIsNewAssetDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!isReady}>
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
                                <FormControl><Input type="text" {...field} /></FormControl>
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

                        <FormField control={form.control} name="systemType" render={({ field }) => (
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
                                 <Select onValueChange={field.onChange} value={field.value} disabled={systemType === 'Cistern'}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                       {systemType === 'Cistern' ? (
                                            <SelectItem value="Cistern">Cistern</SelectItem>
                                       ) : (
                                           <>
                                            <SelectItem value="Pump Out">Pump Out</SelectItem>
                                            <SelectItem value="Mound">Mound</SelectItem>
                                            <SelectItem value="Septic Field">Septic Field</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                            <SelectItem value="Unknown">Unknown</SelectItem>
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

                         <FormField control={form.control} name="abandoned" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Abandoned / Not in Use?</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Yes">Yes</SelectItem>
                                        <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                </Select>
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
              <Button variant="outline" disabled={!isReady}>
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
              <Button variant="outline" disabled={!isReady}>
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
              <Button variant="outline" disabled={!isReady}>
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
      </div>
      <div className="flex items-center gap-2 flex-wrap">
          {isClient && filters.length > 0 && (
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
       <div className="relative flex-grow">
        <ScrollArea className="absolute inset-0 border rounded-lg">
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
                {isReady ? processedAssets.map((asset) => (
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
      </div>
      </div>
    </div>
  );
}
