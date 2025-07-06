import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { CATEGORY_ICONS } from './CategoryIcons';

interface Budget {
  id: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  monthlyLimit: number;
  totalLimit: number;
  spent: number;
  period: string;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
}

interface Transaction {
  id: string;
  userId: string;
  category: string;
  type: string;
  amount: number;
  date: Date;
}

interface RecentBudgetsProps {
  onBudgetCountChange?: (count: number) => void;
  selectedMonth: Date;
}

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
  other: 'border-gray-200',
};

const RecentBudgets: React.FC<RecentBudgetsProps> = ({ onBudgetCountChange, selectedMonth }) => {
  const { currentUser } = useAuth();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const budgetsRef = collection(db, 'budgets');
    const transactionsRef = collection(db, 'transactions');
    const qBudgets = query(
      budgetsRef,
      where('userId', '==', currentUser.uid)
    );
    const qTransactions = query(
      transactionsRef,
      where('userId', '==', currentUser.uid)
    );
    const unsubBudgets = onSnapshot(qBudgets, (budgetsSnap) => {
      const budgetsList = budgetsSnap.docs.map(docSnap => {
        const data = docSnap.data();
        const safeToDate = (field: any) => field && typeof field.toDate === 'function' ? field.toDate() : new Date();
        return {
          id: docSnap.id,
          category: data.category,
          categoryLabel: data.categoryLabel,
          categoryIcon: data.categoryIcon,
          monthlyLimit: data.monthlyLimit,
          totalLimit: data.totalLimit,
          spent: 0, // will be calculated below
          period: data.period,
          periodLabel: data.periodLabel,
          startDate: safeToDate(data.startDate),
          endDate: safeToDate(data.endDate),
        };
      });
      setBudgets(budgetsList);
    });
    const unsubTransactions = onSnapshot(qTransactions, (transactionsSnap) => {
      const transactionsList = transactionsSnap.docs.map(docSnap => {
        const data = docSnap.data();
        const safeToDate = (field: any) => field && typeof field.toDate === 'function' ? field.toDate() : new Date();
        return {
          id: docSnap.id,
          userId: data.userId,
          category: data.category,
          type: data.type,
          amount: data.amount,
          date: safeToDate(data.date),
        };
      });
      setTransactions(transactionsList);
    });
    setLoading(false);
    return () => {
      unsubBudgets();
      unsubTransactions();
    };
  }, [currentUser]);

  // Calculate days remaining for a budget period
  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Filter budgets to only those active in the selected month
  const month = selectedMonth.getMonth();
  const year = selectedMonth.getFullYear();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const budgetsForMonth = budgets.filter(budget =>
    budget.startDate <= endOfMonth && budget.endDate >= startOfMonth
  );
  // Compute spent for each budget (filtered by selectedMonth)
  const budgetsWithSpent = budgetsForMonth.map(budget => {
    const spent = transactions
      .filter(t => t.category === budget.category && t.type === 'expense' && t.date >= startOfMonth && t.date <= endOfMonth)
      .reduce((acc, t) => acc + t.amount, 0);
    return { ...budget, spent };
  });
  // Sort: by progress (descending), then by endDate (descending)
  const sorted = budgetsWithSpent.sort((a, b) => {
    const aProgress = a.spent / a.totalLimit;
    const bProgress = b.spent / b.totalLimit;
    if (bProgress !== aProgress) {
      return bProgress - aProgress; // higher progress first
    }
    return b.endDate.getTime() - a.endDate.getTime(); // then most recent
  });
  const finalBudgets = sorted.slice(0, 3);

  // Report budget count to parent
  useEffect(() => {
    if (onBudgetCountChange) {
      onBudgetCountChange(finalBudgets.length);
    }
  }, [finalBudgets.length, onBudgetCountChange]);

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading budgets...</p>
      </div>
    );
  }

  return (
    <div>
      {finalBudgets.length === 0 ? (
        <div className="text-center py-6 flex flex-col items-center justify-center">
          <img src="/illustration/RecentBudgets.svg" alt="No recent budgets" className="w-24 h-24 mb-4 animate-float" />
          <h3 className="text-lg font-semibold mb-2">No budgets for this month.</h3>
          <p className="text-muted-foreground mb-4">Set a budget to start tracking your spending for this month.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {finalBudgets.map((budget) => {
            const progress = (budget.spent / budget.totalLimit) * 100;
            const isOverBudget = progress > 100;
            const daysRemaining = getDaysRemaining(budget.endDate);
            const borderColor = categoryBorderColors[budget.category] || 'border-gray-200';
            
            return (
              <div
                key={budget.id}
                className={`p-4 rounded-lg border ${borderColor} hover:bg-accent/50 transition-colors`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{CATEGORY_ICONS[budget.category]}</span>
                    <div>
                      <h3 className="font-medium">{budget.categoryLabel}</h3>
                      <p className="text-xs text-muted-foreground">{budget.periodLabel}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${isOverBudget ? 'text-red-500' : ''}`}>
                    {progress.toFixed(0)}%
                  </span>
                </div>
                
                <Progress value={Math.min(progress, 100)} className="mb-2 h-1" />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {currency.symbol}{budget.spent.toLocaleString()} of {currency.symbol}{budget.totalLimit.toLocaleString()}
                  </span>
                  <span className={isOverBudget ? "text-red-500" : "text-green-500"}>
                    {currency.symbol}{Math.abs(budget.totalLimit - budget.spent).toLocaleString()} {isOverBudget ? 'over' : 'left'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {daysRemaining} days remaining
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentBudgets; 