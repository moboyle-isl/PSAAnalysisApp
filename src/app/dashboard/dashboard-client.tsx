'use client';

import { useState } from 'react';
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

export function DashboardClient({ data }: { data: Asset[] }) {
  const [assets, setAssets] = useState<Asset[]>(data);
  const [editingCell, setEditingCell] = useState<string | null>(null); // 'rowId-colKey'

  const handleValueChange = (
    assetId: string,
    key: keyof Asset,
    value: string | number
  ) => {
    setAssets((prevAssets) =>
      prevAssets.map((asset) =>
        asset.assetId === assetId ? { ...asset, [key]: value } : asset
      )
    );
  };

  const renderCellContent = (asset: Asset, key: keyof Asset) => {
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
      if (key === 'fieldNotes') {
         return (
          <Textarea
            autoFocus
            defaultValue={value as string}
            onBlur={(e) => {
              handleValueChange(asset.assetId, key, e.target.value);
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleValueChange(asset.assetId, key, e.currentTarget.value);
                setEditingCell(null);
              }
            }}
            className="h-24"
          />
        );
      }
      return (
        <Input
          autoFocus
          type={typeof value === 'number' ? 'number' : 'text'}
          defaultValue={value as string | number}
          onBlur={(e) => {
            const val = typeof value === 'number' ? Number(e.target.value) : e.target.value;
            handleValueChange(asset.assetId, key, val);
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = typeof value === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value;
              handleValueChange(asset.assetId, key, val);
              setEditingCell(null);
            }
          }}
          className="h-8"
        />
      );
    }
    return <span className="truncate">{String(value)}</span>;
  };

  const headers: { key: keyof Asset; label: string }[] = [
    { key: 'assetId', label: 'Asset ID' },
    { key: 'address', label: 'Address' },
    { key: 'yearInstalled', label: 'Year Installed' },
    { key: 'material', label: 'Material' },
    { key: 'septicSystemType', label: 'System Type' },
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
  ];

  return (
    <ScrollArea className="h-full">
      <div className="relative w-full overflow-auto">
        <Table className="min-w-max">
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header.key} className="whitespace-nowrap">{header.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.assetId}>
                {headers.map((header) => (
                  <TableCell
                    key={header.key}
                    onClick={() => header.key !== 'assetId' && setEditingCell(`${asset.assetId}-${header.key}`)}
                    className={header.key !== 'assetId' ? 'cursor-pointer' : ''}
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
  );
}
