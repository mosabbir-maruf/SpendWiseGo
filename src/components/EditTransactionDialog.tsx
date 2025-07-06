import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { doc, updateDoc, Timestamp, collection, getDocs, query, where, getDoc, updateDoc as updateFirestoreDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_ICONS } from './CategoryIcons';
import { categories } from './categories';

interface EditTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onUpdate: () => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'digital', label: 'Digital Wallet' },
];

const EditTransactionDialog: React.FC<EditTransactionDialogProps> = ({ isOpen, onClose, transaction, onUpdate }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: categories[0].value,
    date: new Date(),
    notes: '',
    tag: '',
    paymentMethod: paymentMethods[0].value,
    goalId: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    if (transaction) {
      // Convert Firestore Timestamp to Date
      let date: Date;
      if (transaction.date?.toDate) {
        date = transaction.date.toDate();
      } else if (transaction.date instanceof Date && !isNaN(transaction.date)) {
        date = transaction.date;
      } else {
        date = new Date();
      }
      setFormData({
        type: ['expense', 'income'].includes(transaction.type) ? transaction.type : 'expense',
        amount: transaction.amount?.toString() || '',
        category: categories.some(c => c.value === transaction.category) ? transaction.category : categories[0].value,
        date,
        notes: transaction.notes || '',
        tag: transaction.tag || '',
        paymentMethod: paymentMethods.some(p => p.value === transaction.paymentMethod) ? transaction.paymentMethod : paymentMethods[0].value,
        goalId: transaction.goalId || '',
      });
    }
  }, [transaction]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchGoals = async () => {
      const q = query(collection(db, 'goals'), where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchGoals();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingFields = [];
    if (!formData.amount) missingFields.push('Amount');
    if (!formData.category) missingFields.push('Category');
    if (!formData.paymentMethod) missingFields.push('Payment Method');
    if (missingFields.length > 0) {
      toast({
        title: "Error",
        description: missingFields.length === 1
          ? `Please fill in the required field: ${missingFields[0]}.`
          : `Please fill in all required fields: ${missingFields.join(', ')}.`,
        variant: "destructive"
      });
      return;
    }
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please log in to edit a transaction.",
        variant: "destructive"
      });
      return;
    }
    try {
      setLoading(true);
      const categoryData = categories.find(cat => cat.value === formData.category);
      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        categoryLabel: categoryData?.label || 'Other',
        categoryIcon: categoryData?.icon || '📝',
        date: Timestamp.fromDate(formData.date),
        notes: formData.notes,
        tag: formData.tag,
        paymentMethod: formData.paymentMethod,
        goalId: formData.goalId,
        updatedAt: Timestamp.now(),
      };
      const transactionRef = doc(db, 'transactions', transaction.id);
      await updateDoc(transactionRef, transactionData);
      toast({
        title: "Success",
        description: "Transaction updated!"
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Something went wrong while updating your transaction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Modify your transaction details below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={['expense', 'income'].includes(formData.type) ? formData.type : 'expense'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (৳)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categories.some(c => c.value === formData.category) ? formData.category : categories[0].value}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
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

          {/* Goal (Optional) - show if category is 'goal' */}
          {formData.category === 'goal' && (
            <div className="space-y-2">
              <Label>Goal (Optional)</Label>
              <Select
                value={formData.goalId || undefined}
                onValueChange={(value) => setFormData(prev => ({ ...prev, goalId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  {goals.length === 0 ? (
                    <SelectItem value="no-goal" disabled>No goals found</SelectItem>
                  ) : (
                    goals.map(goal => (
                      <SelectItem key={goal.id} value={goal.id}>{goal.goalName}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={paymentMethods.some(p => p.value === formData.paymentMethod) ? formData.paymentMethod : paymentMethods[0].value}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tag */}
          <div className="space-y-2">
            <Label htmlFor="tag">Tag (Optional)</Label>
            <Input
              id="tag"
              placeholder="e.g., work, trip, family"
              value={formData.tag}
              onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Updating..." : "Update Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionDialog; 