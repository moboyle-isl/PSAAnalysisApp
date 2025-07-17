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
        asset.id === assetId ? { ...asset, [key]: value } : asset
      )
    );
  };

  const renderCellContent = (asset: Asset, key: keyof Asset) => {
    const cellId = `${asset.id}-${key}`;
    const isEditing = editingCell === cellId;
    const value = asset[key];

    if (isEditing) {
      if (key === 'type') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.id, key, newValue);
              setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pump">Pump</SelectItem>
              <SelectItem value="Valve">Valve</SelectItem>
              <SelectItem value="Pipe">Pipe</SelectItem>
              <SelectItem value="Tank">Tank</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      if (key === 'usageIntensity') {
        return (
          <Select
            defaultValue={value as string}
            onValueChange={(newValue) => {
              handleValueChange(asset.id, key, newValue);
              setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Light">Light</SelectItem>
              <SelectItem value="Moderate">Moderate</SelectItem>
              <SelectItem value="Heavy">Heavy</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      return (
        <Input
          autoFocus
          type={typeof value === 'number' ? 'number' : 'text'}
          defaultValue={value as string | number}
          onBlur={(e) => {
            handleValueChange(asset.id, key, e.target.value);
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleValueChange(asset.id, key, e.currentTarget.value);
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
    { key: 'id', label: 'Asset ID' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'conditionScore', label: 'Condition Score' },
    { key: 'installDate', label: 'Install Date' },
    { key: 'lastMaintenance', label: 'Last Maintenance' },
    { key: 'usageIntensity', label: 'Usage' },
  ];

  return (
    <ScrollArea className="h-full">
      <Table className="w-full">
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header.key}>{header.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id}>
              {headers.map((header) => (
                <TableCell
                  key={header.key}
                  onClick={() => header.key !== 'id' && setEditingCell(`${asset.id}-${header.key}`)}
                  className={header.key !== 'id' ? 'cursor-pointer' : ''}
                >
                  {renderCellContent(asset, header.key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
