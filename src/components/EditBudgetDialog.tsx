import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_ICONS } from './CategoryIcons';

interface EditBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  budget: {
    id: string;
    category: string;
    monthlyLimit: number;
    period: string;
    startDate: Date;
  };
  onUpdate: () => void;
}

const categories = [
  { value: 'food', label: 'Food', icon: 'food' },
  { value: 'transport', label: 'Transport', icon: 'transport' },
  { value: 'entertainment', label: 'Entertainment', icon: 'entertainment' },
  { value: 'shopping', label: 'Shopping', icon: 'shopping' },
  { value: 'housing', label: 'Housing', icon: 'housing' },
  { value: 'utilities', label: 'Utilities', icon: 'utilities' },
  { value: 'health', label: 'Health', icon: 'health' },
  { value: 'salary', label: 'Salary', icon: 'salary' },
  { value: 'savings', label: 'Savings', icon: 'savings' },
  { value: 'other', label: 'Other', icon: 'other' },
];

const budgetPeriods = [
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
  { value: '3months', label: '3 Months', multiplier: 3 },
  { value: '6months', label: '6 Months', multiplier: 6 },
  { value: 'yearly', label: 'Yearly', multiplier: 12 },
];

const EditBudgetDialog: React.FC<EditBudgetDialogProps> = ({ isOpen, onClose, budget, onUpdate }) => {
  const [formData, setFormData] = useState({
    category: budget?.category || '',
    limit: budget?.monthlyLimit?.toString() || '',
    period: budget?.period || 'monthly',
    startDate: budget?.startDate instanceof Date ? budget.startDate : new Date(),
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (budget) {
      setFormData({
        category: budget.category || '',
        limit: budget.monthlyLimit?.toString() || '',
        period: budget.period || 'monthly',
        startDate: budget.startDate instanceof Date ? budget.startDate : new Date(),
      });
    }
  }, [budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.limit || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to edit budgets",
        variant: "destructive"
      });
      return;
    }
    try {
      setLoading(true);
      const categoryData = categories.find(cat => cat.value === formData.category);
      const periodData = budgetPeriods.find(p => p.value === formData.period);
      const monthlyLimit = parseFloat(formData.limit);
      const totalLimit = monthlyLimit * (periodData?.multiplier || 1);
      // Recalculate endDate based on new start date
      const startDate = formData.startDate;
      const endDate = new Date(startDate);
      switch (formData.period) {
        case '3months':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case '6months':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }
      const budgetData = {
        category: formData.category,
        categoryLabel: categoryData?.label || 'Other',
        categoryIcon: categoryData?.icon || '📝',
        monthlyLimit,
        totalLimit,
        period: formData.period,
        periodLabel: periodData?.label || 'Monthly',
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        updatedAt: Timestamp.fromDate(new Date()),
      };
      const budgetRef = doc(db, 'budgets', budget.id);
      await updateDoc(budgetRef, budgetData);
      toast({
        title: "Success",
        description: "Budget updated successfully!"
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast({
        title: "Error",
        description: "Failed to update budget. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
          <DialogDescription>
            Modify your budget details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <span className="flex items-center">
                      <span className="mr-2">{CATEGORY_ICONS[category.icon]}</span>
                      {category.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget Starting Date */}
          <div className="space-y-2">
            <Label>Budget Starting Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.startDate}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, startDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Budget Period */}
          <div className="space-y-2">
            <Label>Budget Period</Label>
            <Select value={formData.period} onValueChange={(value) => setFormData(prev => ({ ...prev, period: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {budgetPeriods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Limit */}
          <div className="space-y-2">
            <Label htmlFor="limit">Monthly Limit (৳)</Label>
            <Input
              id="limit"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.limit}
              onChange={(e) => setFormData(prev => ({ ...prev, limit: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Updating..." : "Update Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBudgetDialog; 