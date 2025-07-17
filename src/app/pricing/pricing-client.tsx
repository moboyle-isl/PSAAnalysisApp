
'use client';

import type { RepairPrice } from '@/lib/data';
import { initialRepairPrices } from '@/lib/data';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function PricingClient() {
  const [prices, setPrices] = useLocalStorage<RepairPrice[]>('repairPrices', initialRepairPrices);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<RepairPrice | null>(null);

  const handleAddOrUpdatePrice = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newPrice: RepairPrice = {
      id: editingPrice?.id || `REPAIR-${Date.now()}`,
      repairType: formData.get('repairType') as string,
      unitPrice: Number(formData.get('unitPrice')),
    };

    let updatedPrices;
    if (editingPrice) {
      updatedPrices = prices.map((p) => (p.id === editingPrice.id ? newPrice : p));
    } else {
      updatedPrices = [...prices, newPrice];
    }
    setPrices(updatedPrices);
    setEditingPrice(null);
    setIsDialogOpen(false);
  };

  const handleDeletePrice = (id: string) => {
    const updatedPrices = prices.filter((p) => p.id !== id);
    setPrices(updatedPrices);
  };
  
  const handleOpenDialog = (price: RepairPrice | null = null) => {
    setEditingPrice(price);
    setIsDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Repair
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPrice ? 'Edit Repair Price' : 'Add New Repair'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddOrUpdatePrice} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="repairType">Repair Type</Label>
                <Input id="repairType" name="repairType" defaultValue={editingPrice?.repairType || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price ($)</Label>
                <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue={editingPrice?.unitPrice || ''} required />
              </div>
              <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingPrice ? 'Save Changes' : 'Add Price'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repair Type</TableHead>
              <TableHead className="w-[150px]">Unit Price</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.length === 0 ? (
               <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No repair prices configured. Click "Add New Repair" to get started.
                  </TableCell>
                </TableRow>
            ) : (
              prices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium">{price.repairType}</TableCell>
                  <TableCell>${price.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(price)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeletePrice(price.id)}>
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
