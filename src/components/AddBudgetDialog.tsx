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
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_ICONS } from './CategoryIcons';

interface AddBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetChange?: () => void;
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

const AddBudgetDialog: React.FC<AddBudgetDialogProps> = ({ isOpen, onClose, onBudgetChange }) => {
  const [formData, setFormData] = useState({
    category: '',
    monthlyLimit: '',
    period: 'monthly',
    startDate: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Calculate total limit based on period
  const calculateTotalLimit = () => {
    const monthlyLimit = parseFloat(formData.monthlyLimit) || 0;
    const period = budgetPeriods.find(p => p.value === formData.period);
    return monthlyLimit * (period?.multiplier || 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.monthlyLimit || !formData.category || !formData.period) {
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
        description: "You must be logged in to add budgets",
        variant: "destructive"
      });
      return;
    }
    if (!currentUser.emailVerified) {
      toast({
        title: "Email Not Verified",
        description: "Please verify your email before adding budgets.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const categoryData = categories.find(cat => cat.value === formData.category);
      const periodData = budgetPeriods.find(p => p.value === formData.period);
      const totalLimit = calculateTotalLimit();
      
      const startDate = formData.startDate;
      const endDate = new Date(startDate);
      
      // Set end date based on period
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
        userId: currentUser.uid,
        category: formData.category,
        categoryLabel: categoryData?.label || 'Other',
        categoryIcon: categoryData?.icon || '📝',
        monthlyLimit: parseFloat(formData.monthlyLimit),
        totalLimit: totalLimit,
        spent: 0,
        period: formData.period,
        periodLabel: periodData?.label || 'Monthly',
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      await addDoc(collection(db, 'budgets'), budgetData);
      
      toast({
        title: "Success",
        description: "Budget added successfully!"
      });
      if (onBudgetChange) onBudgetChange();
      // Reset form
      setFormData({
        category: '',
        monthlyLimit: '',
        period: 'monthly',
        startDate: new Date(),
      });
      onClose();
    } catch (error) {
      console.error('Error adding budget:', error);
      toast({
        title: "Error",
        description: "Failed to add budget. Please try again.",
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
          <DialogTitle>Add Budget</DialogTitle>
          <DialogDescription>
            Set a spending limit for a specific category.
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

          {/* Budget Period - hide if category is 'goal' */}
          {formData.category !== 'goal' && (
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
          )}

          {/* Monthly Limit - hide if category is 'goal' */}
          {formData.category !== 'goal' && (
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Monthly Limit (৳)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                required
              />
            </div>
          )}

          {/* Total Budget Display */}
          {formData.category !== 'goal' && formData.monthlyLimit && (
            <div className="p-4 rounded-lg bg-accent">
              <p className="text-sm text-muted-foreground mb-1">Total Budget for {budgetPeriods.find(p => p.value === formData.period)?.label}:</p>
              <p className="text-lg font-semibold">৳{calculateTotalLimit().toLocaleString()}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBudgetDialog; 