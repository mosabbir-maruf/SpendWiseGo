import * as React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Wallet, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { collection, addDoc, Timestamp, query, where, getDocs, getDoc, updateDoc, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORY_ICONS } from './CategoryIcons';
import { categories } from './categories';
import { useToast } from '@/hooks/use-toast';

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Wallet },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'bank', label: 'Bank Transfer', icon: Banknote },
  { value: 'digital', label: 'Digital Wallet', icon: Smartphone },
];

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    date: new Date(),
    notes: '',
    tag: '',
    paymentMethod: '',
    goalId: '',
  });
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [savings, setSavings] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchGoals = async () => {
      const q = query(collection(db, 'goals'), where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchGoals();
    // Fetch savings
    const fetchSavings = async () => {
      const q = query(collection(db, 'savings'), where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      setSavings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchSavings();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!currentUser.emailVerified) {
      toast({ title: 'Email Not Verified', description: 'Please verify your email before adding transactions.', variant: 'destructive' });
      return;
    }
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
    let docRef = null;
    try {
      const categoryData = categories.find(cat => cat.value === formData.category);
      const transactionData: any = {
        userId: currentUser.uid,
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        categoryLabel: categoryData?.label || 'Other',
        categoryIcon: categoryData?.icon || '📝',
        date: Timestamp.fromDate(formData.date),
        notes: formData.notes,
        tag: formData.tag,
        paymentMethod: formData.paymentMethod,
        createdAt: Timestamp.now(),
      };
      if (formData.category === 'goal') {
        transactionData.goalId = formData.goalId;
      }
      if (formData.category === 'savings') {
        transactionData.savingId = formData.goalId;
        transactionData.categoryLabel = 'Savings';
        transactionData.categoryIcon = 'savings';
      }
      console.log('Saving transaction to Firebase:', transactionData);
      docRef = await addDoc(collection(db, 'transactions'), transactionData);
      toast({
        title: "Success",
        description: "Transaction added!"
      });
      // Reset form
      setFormData({
        type: 'expense',
        amount: '',
        category: '',
        date: new Date(),
        notes: '',
        tag: '',
        paymentMethod: '',
        goalId: '',
      });
      onClose();
    } catch (error: any) {
      console.error('Transaction add error:', error);
      toast({
        title: "Error",
        description: "Something went wrong while adding your transaction. Please try again.",
        variant: "destructive"
      });
      return;
    }
    // After adding, check if goal should be marked as complete
    if (formData.category === 'goal' && formData.goalId) {
      try {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid),
          where('goalId', '==', formData.goalId)
        );
        const snapshot = await getDocs(q);
        const total = snapshot.docs.reduce((sum, t) => sum + (t.data().amount || 0), 0);
        const goalDoc = await getDoc(firestoreDoc(db, 'goals', formData.goalId));
        const goalData = goalDoc.data();
        if (goalData && total >= goalData.goalAmount && !goalData.goalCompleted) {
          await updateDoc(firestoreDoc(db, 'goals', formData.goalId), { goalCompleted: true });
        }
      } catch (goalError) {
        console.error('Goal completion error:', goalError);
        // Optionally show a toast for this specific error
      }
    }
  };

  console.log('Type value:', formData.type);
  console.log('Category value:', formData.category, 'Categories:', categories);
  console.log('PaymentMethod value:', formData.paymentMethod, 'PaymentMethods:', paymentMethods);
  console.log('GoalId value:', formData.goalId, 'Goals:', goals);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Add a new income or expense transaction to track your finances.
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
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center">
                      <span className="mr-2">{CATEGORY_ICONS[cat.icon]}</span>
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal (Optional) - move right after Category */}
          {formData.category === 'goal' && (
            <div className="space-y-2">
              <Label>Goal (Optional)</Label>
              <Select value={formData.goalId} onValueChange={(value) => setFormData(prev => ({ ...prev, goalId: value }))}>
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

          {/* Savings (Optional) - show when category is savings */}
          {formData.category === 'savings' && (
            <div className="space-y-2">
              <Label>Saving (Optional)</Label>
              <Select value={formData.goalId} onValueChange={(value) => setFormData(prev => ({ ...prev, goalId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a saving" />
                </SelectTrigger>
                <SelectContent>
                  {savings.length === 0 ? (
                    <SelectItem value="no-saving" disabled>No savings found</SelectItem>
                  ) : (
                    savings.map(saving => (
                      <SelectItem key={saving.id} value={saving.id}>{saving.savingsName}</SelectItem>
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
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value}>
                    <span className="flex items-center">
                      <pm.icon className="mr-2 w-4 h-4" />
                      {pm.label}
                    </span>
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
            <Button type="submit" className="flex-1">
              Add Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
