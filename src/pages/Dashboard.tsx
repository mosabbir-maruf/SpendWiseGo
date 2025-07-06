import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Target } from 'lucide-react';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import TransactionChart from '@/components/TransactionChart';
import RecentTransactions from '@/components/RecentTransactions';
import RecentBudgets from '@/components/RecentBudgets';
import { collection, query, where, getDocs, orderBy, Timestamp, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_ICONS } from '@/components/CategoryIcons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { motion, useMotionValue, useTransform } from 'framer-motion';

const goalIcons = [
  <Target className="w-8 h-8 text-primary" />
];

// Add cardBorderColors palette (reuse from Goal.tsx)
const cardBorderColors = [
  'border-blue-400',
  'border-yellow-400',
  'border-amber-400',
  'border-purple-400',
  'border-pink-400',
  'border-green-400',
  'border-red-400',
  'border-indigo-400',
  'border-fuchsia-400',
];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i); // 10 years back, 10 years forward

const Dashboard: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { currency } = useCurrency();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    transactions: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentGoal, setRecentGoal] = useState<any>(null);
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalLoading, setGoalLoading] = useState(true);
  const [recentSaving, setRecentSaving] = useState<any>(null);
  const [savingProgress, setSavingProgress] = useState(0);
  const [savingLoading, setSavingLoading] = useState(true);
  const [budgetCount, setBudgetCount] = useState(0);
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [allTimeNetBalance, setAllTimeNetBalance] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser) {
      setLoading(true);
      const transactionsRef = collection(db, 'transactions');
      
      // All-time net balance
      const allTimeQ = query(
        transactionsRef,
        where('userId', '==', currentUser.uid)
      );
      
      // Monthly stats
      const month = selectedMonth.getMonth();
      const year = selectedMonth.getFullYear();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const monthlyQ = query(
        transactionsRef,
        where('userId', '==', currentUser.uid),
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth)),
        orderBy('date', 'desc')
      );

      // Set up real-time listeners
      const unsubscribeAllTime = onSnapshot(allTimeQ, (allTimeSnapshot) => {
        let allTimeIncome = 0;
        let allTimeExpenses = 0;
        allTimeSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.type === 'income') {
            allTimeIncome += data.amount;
          } else {
            allTimeExpenses += data.amount;
          }
        });
        setAllTimeNetBalance(allTimeIncome - allTimeExpenses);
      });

      const unsubscribeMonthly = onSnapshot(monthlyQ, (monthlySnapshot) => {
        let totalIncome = 0;
        let totalExpenses = 0;
        monthlySnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.type === 'income') {
            totalIncome += data.amount;
          } else {
            totalExpenses += data.amount;
          }
        });
        setStats({
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
          transactions: monthlySnapshot.size
        });
        setLoading(false);
      });

      return () => {
        unsubscribeAllTime();
        unsubscribeMonthly();
      };
    }
  }, [authLoading, currentUser, selectedMonth]);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    setGoalLoading(true);
    setSavingLoading(true);
    const goalsRef = collection(db, 'goals');
    const transactionsRef = collection(db, 'transactions');
    const savingsRef = collection(db, 'savings');
    let qGoals = query(
      goalsRef,
      where('userId', '==', currentUser.uid),
      limit(10)
    );
    let qTransactions = query(
      transactionsRef,
      where('userId', '==', currentUser.uid)
    );
    let qSavings = query(
      savingsRef,
      where('userId', '==', currentUser.uid),
      limit(10)
    );
    // Single function to reload both goals and savings efficiently
    const reloadAll = () => {
      reloadGoalsAndProgress();
      reloadSavingsAndProgress();
    };
    
    // Listen for real-time updates - use a single transaction listener that triggers both updates
    const unsubGoals = onSnapshot(qGoals, reloadAll);
    const unsubTransactions = onSnapshot(qTransactions, reloadAll);
    const unsubSavings = onSnapshot(qSavings, reloadAll);

    async function reloadGoalsAndProgress() {
      const snapshot = await getDocs(qGoals);
      if (snapshot.empty) {
        setRecentGoal(null);
        setGoalProgress(0);
        setGoalLoading(false);
        return;
      }
      
      // Get all transactions in one query
      const allTransactionsQuery = query(
        transactionsRef,
        where('userId', '==', currentUser.uid)
      );
      const transactionsSnapshot = await getDocs(allTransactionsQuery);
      
      // Build a map of goalId -> total transaction amount
      const goalTotals = new Map<string, number>();
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.goalId && typeof data.amount === 'number') {
          const currentTotal = goalTotals.get(data.goalId) || 0;
          goalTotals.set(data.goalId, currentTotal + data.amount);
        }
      });
      
      // Process goals efficiently
      const goalsWithProgress = snapshot.docs.map((goalDoc) => {
        const goalData = goalDoc.data();
        const goal = { id: goalDoc.id, ...goalData };
        const total = goalTotals.get(goal.id) || 0;
        const manualSaved = typeof goalData.savedMoney === 'number' ? goalData.savedMoney : 0;
        const progress = (total + manualSaved) / (goalData.goalAmount || 1);
        return { ...goal, progress, total: total + manualSaved };
      });
      
      const sortedGoals = goalsWithProgress.sort((a, b) => {
        if (b.progress !== a.progress) {
          return b.progress - a.progress;
        }
        const aCreatedAt = (a as any).createdAt?.toDate?.() || new Date((a as any).createdAt || 0);
        const bCreatedAt = (b as any).createdAt?.toDate?.() || new Date((b as any).createdAt || 0);
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      });
      const mostRecentGoal = sortedGoals[0];
      setRecentGoal(mostRecentGoal);
      setGoalProgress(mostRecentGoal.total);
      setGoalLoading(false);
    }

    // --- OPTIMIZED SAVINGS LOGIC ---
    async function reloadSavingsAndProgress() {
      // Fetch all savings
      const savingsSnap = await getDocs(qSavings);
      if (savingsSnap.empty) {
        setRecentSaving(null);
        setSavingProgress(0);
        setSavingLoading(false);
        return;
      }
      
      // Get all transactions in one query (reuse the same query from goals)
      const allTransactionsQuery = query(
        transactionsRef,
        where('userId', '==', currentUser.uid)
      );
      const transactionsSnap = await getDocs(allTransactionsQuery);
      
      // Build a map of savingId -> total transaction amount
      const savingTotals = new Map<string, number>();
      transactionsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.savingId && typeof data.amount === 'number') {
          const currentTotal = savingTotals.get(data.savingId) || 0;
          savingTotals.set(data.savingId, currentTotal + data.amount);
        }
      });
      
      // Process savings efficiently
      const savingsWithProgress = savingsSnap.docs.map((savingDoc) => {
        const savingData = savingDoc.data();
        const saving = { id: savingDoc.id, ...savingData };
        const manualSaved = typeof savingData.savedMoney === 'number' ? savingData.savedMoney : 0;
        const total = manualSaved + (savingTotals.get(saving.id) || 0);
        const progress = total / (savingData.savingsAmount || 1);
        return { ...saving, progress, total };
      });
      
      const sortedSavings = savingsWithProgress.sort((a, b) => {
        if (b.progress !== a.progress) {
          return b.progress - a.progress;
        }
        const aCreatedAt = (a as any).createdAt?.toDate?.() || new Date((a as any).createdAt || 0);
        const bCreatedAt = (b as any).createdAt?.toDate?.() || new Date((b as any).createdAt || 0);
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      });
      const mostRecentSaving = sortedSavings[0];
      setRecentSaving(mostRecentSaving);
      setSavingProgress(mostRecentSaving.total);
      setSavingLoading(false);
    }
    // Initial load
    reloadGoalsAndProgress();
    reloadSavingsAndProgress();
    return () => {
      unsubGoals();
      unsubTransactions();
      unsubSavings();
    };
  }, [authLoading, currentUser]);

  // Calculate transaction limit based on budget count
  const getTransactionLimit = () => {
    if (budgetCount === 1) return 8;
    if (budgetCount === 2) return 6;
    return 5; // default fallback
  };

  const handleBudgetCountChange = (count: number) => {
    setBudgetCount(count);
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><span>Loading...</span></div>;
  }
  if (!currentUser) {
    return <div className="flex justify-center items-center h-screen"><span>Please log in to view your dashboard.</span></div>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="animate-fade-in">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarImage src={currentUser?.photoURL || '/avatar/avatar1.png'} alt={currentUser?.displayName || 'User'} />
                <AvatarFallback>{currentUser?.displayName?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <Text variant="heading-32" className="flex items-center">
                {greeting}, {currentUser?.displayName || 'User'}!
              </Text>
            </div>
            <Text variant="copy-16" color="gray-1000" className="mt-1">
              Here's your financial overview for this month
            </Text>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="mt-4 sm:mt-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {/* Month Selector UI */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label htmlFor="month-select" className="text-sm font-medium text-muted-foreground">Month:</label>
            <Select
              value={String(selectedMonth.getMonth())}
              onValueChange={value => setSelectedMonth(new Date(selectedMonth.getFullYear(), Number(value), 1))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, idx) => (
                  <SelectItem key={name} value={String(idx)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Text variant="label-14" color="gray-1000" className="ml-2">Year:</Text>
            <Select
              value={String(selectedMonth.getFullYear())}
              onValueChange={value => setSelectedMonth(new Date(Number(value), selectedMonth.getMonth(), 1))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow animate-fade-in border border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <Text size={28} className="text-green-600">
                {loading ? '...' : `${currency.symbol}${stats.totalIncome.toLocaleString()}`}
              </Text>
              <Text variant="copy-13" color="gray-1000">
                This month
              </Text>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow animate-fade-in border border-red-200" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <Text size={28} className="text-red-600">
                {loading ? '...' : `${currency.symbol}${stats.totalExpenses.toLocaleString()}`}
              </Text>
              <Text variant="copy-13" color="gray-1000">
                This month
              </Text>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow animate-fade-in border border-cyan-200" style={{ animationDelay: '200ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <Text size={28} className={`${allTimeNetBalance >= 0 ? 'text-primary' : 'text-red-600'}`}>
                {loading ? '...' : `${currency.symbol}${allTimeNetBalance.toLocaleString()}`}
              </Text>
              <Text variant="copy-13" color="gray-1000">
                All time
              </Text>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow animate-fade-in border border-gray-200" style={{ animationDelay: '300ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Text size={28}>
                {loading ? '...' : stats.transactions}
              </Text>
              <Text variant="copy-13" color="gray-1000">
                This month
              </Text>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Charts and Goal */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Goal before Spending by Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* Goal Card */}
              <Card className="hover:shadow-lg transition-shadow animate-fade-in w-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Goal</CardTitle>
                  <Button variant="link" size="sm" onClick={() => navigate('/goal')}>View All</Button>
                </CardHeader>
                <CardContent>
                  {goalLoading ? (
                    <div className="flex flex-1 flex-col items-center justify-center">
                      <div className="w-8 h-8 mb-4 animate-spin rounded-full border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading goal...</p>
                    </div>
                  ) : recentGoal ? (
                    <>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="rounded-full bg-primary/10 p-3 flex items-center justify-center">
                          {goalIcons[0]}
                        </div>
                        <div>
                                                <Text variant="heading-20" className="leading-tight">{recentGoal.goalName}</Text>
                      <Text variant="copy-13" color="gray-1000">Target: {currency.symbol}{recentGoal.goalAmount}</Text>
                        </div>
                        {recentGoal.goalCompleted && (
                          <span className="ml-auto bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">Completed</span>
                        )}
                      </div>
                      <Progress value={Math.min((goalProgress / (recentGoal.goalAmount || 1)) * 100, 100)} className="mb-2 h-1" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Saved: <span className="font-medium text-foreground">{currency.symbol}{goalProgress}</span></span>
                        <span>{((goalProgress / (recentGoal.goalAmount || 1)) * 100).toFixed(1)}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center">
                      <img src="/illustration/goal.svg" alt="No goals" className="w-24 h-24 mb-2 animate-float" />
                      <Text variant="copy-16" color="gray-1000">No goals found</Text>
                    </div>
                  )}
                </CardContent>
              </Card>
              {/* Savings Card */}
              <Card className="hover:shadow-lg transition-shadow animate-fade-in w-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Savings</CardTitle>
                  <Button variant="link" size="sm" onClick={() => navigate('/goal')}>View All</Button>
                </CardHeader>
                <CardContent>
                  {savingLoading ? (
                    <div className="flex flex-1 flex-col items-center justify-center">
                      <div className="w-8 h-8 mb-4 animate-spin rounded-full border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading savings...</p>
                    </div>
                  ) : recentSaving ? (
                    <>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="rounded-full bg-primary/10 p-3 flex items-center justify-center">
                          {CATEGORY_ICONS[recentSaving?.category || 'savings']}
                        </div>
                        <div>
                          <Text variant="heading-20" className="leading-tight">{recentSaving.savingsName}</Text>
                          <Text variant="copy-13" color="gray-1000">Target: {currency.symbol}{recentSaving.savingsAmount}</Text>
                        </div>
                        {recentSaving.savingsCompleted && (
                          <span className="ml-auto bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">Completed</span>
                        )}
                      </div>
                      <Progress value={Math.min((savingProgress / (recentSaving.savingsAmount || 1)) * 100, 100)} className="mb-2 h-1" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Saved: <span className="font-medium text-foreground">{currency.symbol}{savingProgress}</span></span>
                        <span>{((savingProgress / (recentSaving.savingsAmount || 1)) * 100).toFixed(1)}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center">
                      <img src="/illustration/Savings.svg" alt="No savings" className="w-24 h-24 mb-2 animate-float" />
                      <Text variant="copy-16" color="gray-1000">No savings found</Text>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionChart chartType="pie" selectedMonth={selectedMonth} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Daily Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionChart chartType="bar" selectedMonth={selectedMonth} />
              </CardContent>
            </Card>
          </div>
          {/* Right: Recent Activity */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Button variant="link" size="sm" onClick={() => navigate('/transactions')}>View All</Button>
              </CardHeader>
              <CardContent>
                <RecentTransactions limit={getTransactionLimit()} selectedMonth={selectedMonth} />
              </CardContent>
            </Card>
            {/* 3D Hover Effect for Recent Budgets Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Budgets</CardTitle>
                <Button variant="link" size="sm" onClick={() => navigate('/budget')}>View All</Button>
              </CardHeader>
              <CardContent>
                <RecentBudgets onBudgetCountChange={handleBudgetCountChange} selectedMonth={selectedMonth} />
              </CardContent>
            </Card>
          </div>
        </div>

        <AddTransactionDialog 
          isOpen={isAddDialogOpen} 
          onClose={() => {
            setIsAddDialogOpen(false);
          }} 
        />
      </div>
    </Layout>
  );
};

export default Dashboard;
