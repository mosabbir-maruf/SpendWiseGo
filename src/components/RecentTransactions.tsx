import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, TrendingUp, TrendingDown, Wallet, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import EditTransactionDialog from './EditTransactionDialog';
import { CATEGORY_ICONS } from './CategoryIcons';

const categories = {
  food: { label: 'Food', icon: '🍽️' },
  transport: { label: 'Transportation', icon: '🚗' },
  shopping: { label: 'Shopping', icon: '🛍️' },
  entertainment: { label: 'Entertainment', icon: '🎬' },
  health: { label: 'Health & Medical', icon: '🏥' },
  education: { label: 'Education', icon: '📚' },
  bills: { label: 'Bills & Utilities', icon: '💡' },
  salary: { label: 'Salary', icon: '💼' },
  investment: { label: 'Investment', icon: '📈' },
  goal: { label: 'Goal', icon: '🎯' },
  other: { label: 'Other', icon: '📝' },
};

const categoryBorderColors: Record<string, string> = {
  food: 'border-orange-200',
  transport: 'border-blue-200',
  shopping: 'border-pink-200',
  entertainment: 'border-purple-200',
  health: 'border-red-200',
  education: 'border-yellow-200',
  bills: 'border-cyan-200',
  salary: 'border-green-200',
  investment: 'border-emerald-200',
  goal: 'border-indigo-200',
  other: 'border-gray-200',
};

const paymentMethodIcons: Record<string, React.ReactNode> = {
  cash: <Wallet className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
  bank: <Banknote className="w-4 h-4" />,
  digital: <Smartphone className="w-4 h-4" />,
  other: <Wallet className="w-4 h-4" />,
};

interface RecentTransactionsProps {
  limit?: number;
  selectedMonth: Date;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ limit: propLimit = 5, selectedMonth }) => {
  const { currentUser } = useAuth();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    const transactionsRef = collection(db, 'transactions');
    const month = selectedMonth.getMonth();
    const year = selectedMonth.getFullYear();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
      transactionsRef,
      where('userId', '==', currentUser.uid),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth),
      orderBy('date', 'desc'),
      limit(propLimit)
    );

    // Set up real-time listener with caching
    const unsubscribe = onSnapshot(q, 
      {
        next: (snapshot) => {
          const transactionsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
          }));
          console.log('Loaded transactions:', transactionsList);
          setTransactions(transactionsList);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error loading recent transactions:', error);
          toast({
            title: "Error",
            description: "Failed to load transactions. Please try again.",
            variant: "destructive"
          });
          setLoading(false);
        }
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [currentUser, toast, propLimit, selectedMonth]);

  const handleEditClick = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setSelectedTransaction(null);
    setIsEditDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center justify-center">
          <img src="/illustration/transactions.svg" alt="No recent transactions" className="w-24 h-24 mb-4 animate-float" />
          <h3 className="text-lg font-semibold mb-2">No transactions this month yet.</h3>
          <p className="text-muted-foreground mb-4">Start by adding your first transaction for this month.</p>
        </div>
      ) : (
        transactions.map((transaction) => {
          const categoryData = categories[transaction.category as keyof typeof categories] || categories.other;
          let label = categoryData.label;
          let icon = CATEGORY_ICONS[transaction.category];
          let borderColor = categoryBorderColors[transaction.category] || 'border-gray-200';
          if (transaction.category === 'savings') {
            label = 'Savings';
            icon = CATEGORY_ICONS['savings'];
            borderColor = 'border-blue-200';
          }
          return (
            <div
              key={transaction.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${borderColor} hover:bg-accent/50 transition-colors`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-lg">{icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(transaction.date, 'MMM dd, yyyy p')}
                  </p>
                  {transaction.notes && (
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {transaction.notes}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className={`font-semibold text-sm flex items-center ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {transaction.type === 'income' ? '+' : '-'}{currency.symbol}{transaction.amount}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {paymentMethodIcons[transaction.paymentMethod?.toLowerCase?.()] || paymentMethodIcons.other}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEditClick(transaction)}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })
      )}
      {selectedTransaction && (
        <EditTransactionDialog
          isOpen={isEditDialogOpen}
          onClose={handleEditClose}
          transaction={selectedTransaction}
          onUpdate={() => {
            // The real-time listener will automatically update the transactions
            handleEditClose();
          }}
        />
      )}
    </div>
  );
};

export default RecentTransactions;
