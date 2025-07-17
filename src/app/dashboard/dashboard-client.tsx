
'use client';

import { useState, useMemo } from 'react';
import type { Asset } from '@/lib/data';
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
import { Wand2, Loader2, View, Filter as FilterIcon, X } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type AssetWithRecommendation = Asset & { recommendation?: string };

type Column = {
  key: keyof AssetWithRecommendation;
  label: string;
  type: 'string' | 'number' | 'enum';
  options?: string[];
};

const ALL_COLUMNS: Column[] = [
    { key: 'assetId', label: 'Asset ID', type: 'string' },
    { key: 'address', label: 'Address', type: 'string' },
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
    { key: 'recommendation', label: 'AI Recommendation', type: 'string' },
];

const OPERATORS = {
  string: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'not_equals', label: 'Does not equal' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '!=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
  ],
  enum: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
  ],
};


type Filter = {
  id: string;
  column: keyof AssetWithRecommendation;
  operator: string;
  value: string | number;
};


export function DashboardClient({ data }: { data: Asset[] }) {
  const [assets, setAssets] = useState<AssetWithRecommendation[]>(data);
  const [editingCell, setEditingCell] = useState<string | null>(null); // 'rowId-colKey'
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    assetId: true,
    address: true,
    yearInstalled: true,
    material: true,
    septicSystemType: true,
    assetSubType: true,
    setbackFromWaterSource: false,
    setbackFromHouse: false,
    tankBuryDepth: false,
    openingSize: false,
    aboveGroundCollarHeight: false,
    siteCondition: true,
    coverCondition: true,
    collarCondition: true,
    interiorCondition: true,
    overallCondition: true,
    fieldNotes: true,
    recommendation: true,
  });

  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<{column?: Column, operator?: string, value?: string}>({});

  const visibleColumns = ALL_COLUMNS.filter(
    (column) => columnVisibility[column.key]
  );
  
  const handleAddFilter = () => {
    if (currentFilter.column && currentFilter.operator && currentFilter.value) {
      const newFilter: Filter = {
        id: `filter-${Date.now()}`,
        column: currentFilter.column.key,
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
  
  const filteredAssets = useMemo(() => {
    if (filters.length === 0) {
      return assets;
    }
    return assets.filter(asset => {
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
            if (filter.operator === 'equals') return numValue === filterNumValue;
            if (filter.operator === 'not_equals') return numValue !== filterNumValue;
            if (filter.operator === 'gt') return numValue > filterNumValue;
            if (filter.operator === 'gte') return numValue >= filterNumValue;
            if (filter.operator === 'lt') return numValue < filterNumValue;
            if (filter.operator === 'lte') return numValue <= filterNumValue;
            break;
        }
        return true;
      });
    });
  }, [assets, filters]);


  const handleRunRecommendations = async () => {
    setIsGenerating(true);
    try {
      const result = await recommendRepairsForAllAssets({
        assets: assets,
        userDefinedRules: 'Prioritize repairs that extend life by over 5 years. Replace if repair cost exceeds 60% of new asset cost.',
      });

      const recommendationsMap = new Map(
        result.recommendations.map((r) => [r.assetId, r.recommendations])
      );

      setAssets((prevAssets) =>
        prevAssets.map((asset) => ({
          ...asset,
          recommendation: recommendationsMap.get(asset.assetId) || asset.recommendation || 'No specific recommendation.',
        }))
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

  const renderCellContent = (asset: AssetWithRecommendation, key: keyof AssetWithRecommendation) => {
    const cellId = `${asset.assetId}-${key}`;
    const isEditing = editingCell === cellId;
    const value = asset[key];

    if (isEditing) {
      if (key === 'septicSystemType') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.assetId, key, newValue);
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
              handleValueChange(asset.assetId, key, newValue);
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
              handleValueChange(asset.assetId, key, newValue);
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
    return <span className="truncate">{String(value ?? '')}</span>;
  };

  const isCellEditable = (asset: AssetWithRecommendation, key: keyof AssetWithRecommendation) => {
    if (key === 'assetId' || key === 'recommendation') return false;
    if (key === 'assetSubType' && asset.septicSystemType === 'Cistern') return false;
    return true;
  }
  
  const renderFilterValueInput = () => {
    if (!currentFilter.column) return null;
    
    if (currentFilter.column.type === 'enum') {
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
         type={currentFilter.column.type === 'number' ? 'number' : 'text'}
         placeholder="Enter value..."
         value={currentFilter.value || ''}
         onChange={(e) => setCurrentFilter(f => ({ ...f, value: e.target.value }))}
       />
    )
  }

  return (
    <div className="flex flex-col h-full space-y-4">
       <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
           <Button onClick={handleRunRecommendations} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Run AI Recommendations
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">
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
                        {ALL_COLUMNS.filter(c => c.key !== 'assetId').map(col => (
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
                          {OPERATORS[currentFilter.column!.type].map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Value</Label>
                      {renderFilterValueInput()}
                    </div>
                  </>
                )}
                <Button onClick={handleAddFilter} disabled={!currentFilter.column || !currentFilter.operator || !currentFilter.value}>Add Filter</Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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
      {filters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Active Filters:</span>
          {filters.map(filter => {
             const column = ALL_COLUMNS.find(c => c.key === filter.column);
             const operator = OPERATORS[column!.type].find(o => o.value === filter.operator);
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
        </div>
      )}
      <ScrollArea className="flex-grow">
        <div className="relative w-full overflow-auto">
          <Table className="min-w-max">
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                {visibleColumns.map((header) => (
                  <TableHead key={header.key} className="whitespace-nowrap">{header.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.assetId}>
                  {visibleColumns.map((header) => (
                    <TableCell
                      key={header.key}
                      onClick={() => isCellEditable(asset, header.key) && setEditingCell(`${asset.assetId}-${header.key}`)}
                      className={isCellEditable(asset, header.key) ? 'cursor-pointer' : ''}
                    >
                      {renderCellContent(asset, header.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
