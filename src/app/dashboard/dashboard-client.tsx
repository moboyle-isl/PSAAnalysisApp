
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
import { Wand2, Loader2, View } from 'lucide-react';
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
import { Label } from '@/components/ui/label';

type AssetWithRecommendation = Asset & { recommendation?: string };

type Column = {
  key: keyof AssetWithRecommendation;
  label: string;
};

const ALL_COLUMNS: Column[] = [
    { key: 'assetId', label: 'Asset ID' },
    { key: 'address', label: 'Address' },
    { key: 'yearInstalled', label: 'Year Installed' },
    { key: 'material', label: 'Material' },
    { key: 'septicSystemType', label: 'System Type' },
    { key: 'assetSubType', label: 'Sub-Type' },
    { key: 'setbackFromWaterSource', label: 'Setback Water (m)' },
    { key: 'setbackFromHouse', label: 'Setback House (m)' },
    { key: 'tankBuryDepth', label: 'Bury Depth (m)' },
    { key: 'openingSize', label: 'Opening Size (m)' },
    { key: 'aboveGroundCollarHeight', label: 'Collar Height (m)' },
    { key: 'siteCondition', label: 'Site Condition' },
    { key: 'coverCondition', label: 'Cover Condition' },
    { key: 'collarCondition', label: 'Collar Condition' },
    { key: 'interiorCondition', label: 'Interior Condition' },
    { key: 'overallCondition', label: 'Overall Condition' },
    { key: 'fieldNotes', label: 'Field Notes' },
    { key: 'recommendation', label: 'AI Recommendation' },
];


export function DashboardClient({ data }: { data: Asset[] }) {
  const [assets, setAssets] = useState<AssetWithRecommendation[]>(data);
  const [editingCell, setEditingCell] = useState<string | null>(null); // 'rowId-colKey'
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const [columnVisibility, setColumnVisibility] = useState<
    Record<keyof AssetWithRecommendation, boolean>
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

  const [systemTypeFilter, setSystemTypeFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');

  const visibleColumns = ALL_COLUMNS.filter(
    (column) => columnVisibility[column.key]
  );

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const systemTypeMatch = systemTypeFilter === 'all' || asset.septicSystemType === systemTypeFilter;
      const materialMatch = materialFilter === 'all' || asset.material === materialFilter;
      return systemTypeMatch && materialMatch;
    });
  }, [assets, systemTypeFilter, materialFilter]);

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
    if (key === 'assetId') return false;
    if (key === 'assetSubType' && asset.septicSystemType === 'Cistern') return false;
    return true;
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
          <div className="flex items-center gap-2">
            <Label htmlFor="system-type-filter" className="text-sm font-medium">System Type</Label>
            <Select value={systemTypeFilter} onValueChange={setSystemTypeFilter}>
              <SelectTrigger id="system-type-filter" className="w-[180px]">
                <SelectValue placeholder="Filter by type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Cistern">Cistern</SelectItem>
                <SelectItem value="Septic Tank">Septic Tank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="material-filter" className="text-sm font-medium">Material</Label>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger id="material-filter" className="w-[180px]">
                <SelectValue placeholder="Filter by material..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Concrete">Concrete</SelectItem>
                <SelectItem value="Polyethylene">Polyethylene</SelectItem>
                <SelectItem value="Fibreglass">Fibreglass</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

    