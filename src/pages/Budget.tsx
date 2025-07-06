import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { collection, query, where, getDocs, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import AddBudgetDialog from '@/components/AddBudgetDialog';
import EditBudgetDialog from '@/components/EditBudgetDialog';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { exportTransactionsToPDF } from '@/utils/exportUtils';
import { exportBudgetsToPDF } from '@/utils/exportUtils';
import { CATEGORY_ICONS } from '@/components/CategoryIcons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { DateRange } from 'react-day-picker';

interface Budget {
  id: string;
  userId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const Budget: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const [sortBy, setSortBy] = useState('latest');
  const [exportingTransactions, setExportingTransactions] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [budgetSearch, setBudgetSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Category color map for border
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

  // Define categories and periods for dropdowns
  const budgetCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'food', label: 'Food & Dining' },
    { value: 'transport', label: 'Transportation' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'health', label: 'Health & Medical' },
    { value: 'education', label: 'Education' },
    { value: 'bills', label: 'Bills & Utilities' },
    { value: 'salary', label: 'Salary' },
    { value: 'investment', label: 'Investment' },
    { value: 'other', label: 'Other' },
  ];
  const budgetPeriods = [
    { value: 'all', label: 'All Periods' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' },
  ];

  // Standalone loadBudgets function
  const loadBudgets = async () => {
    if (!currentUser || !currentUser.uid) return;
    try {
      setLoading(true);
      
      // Get all budgets in one query
      const budgetsRef = collection(db, 'budgets');
      const budgetsQuery = query(
        budgetsRef,
        where('userId', '==', currentUser.uid)
      );
      const budgetsSnapshot = await getDocs(budgetsQuery);
      
      // Get all transactions in one query
      const transactionsRef = collection(db, 'transactions');
      const transactionsQuery = query(
        transactionsRef,
        where('userId', '==', currentUser.uid),
        where('type', '==', 'expense')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      // Process transactions into a map for efficient lookup
      const transactionsByCategory = new Map<string, any[]>();
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category;
        if (category && !transactionsByCategory.has(category)) {
          transactionsByCategory.set(category, []);
        }
        if (category) {
          transactionsByCategory.get(category)!.push(data);
        }
      });
      
      // Process budgets efficiently
      const budgetsList: Budget[] = [];
      for (const doc of budgetsSnapshot.docs) {
        const data = doc.data();
        const safeToDate = (field: any) => field && typeof field.toDate === 'function' ? field.toDate() : new Date();
        const budgetStartDate = safeToDate(data.startDate);
        const budgetEndDate = safeToDate(data.endDate);
        
        if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') continue;
        
        // Get transactions for this category from the map
        const categoryTransactions = transactionsByCategory.get(data.category) || [];
        
        // Calculate spent amount efficiently
        const spent = categoryTransactions
          .filter(t => {
            const transactionDate = t.date && typeof t.date.toDate === 'function' ? t.date.toDate() : new Date();
            return transactionDate >= budgetStartDate && transactionDate <= budgetEndDate;
          })
          .reduce((acc, t) => acc + (t.amount || 0), 0);
        
        budgetsList.push({
          id: doc.id,
          userId: data.userId,
          category: data.category,
          categoryLabel: data.categoryLabel,
          categoryIcon: data.categoryIcon,
          monthlyLimit: data.monthlyLimit,
          totalLimit: data.totalLimit,
          spent,
          period: data.period,
          periodLabel: data.periodLabel,
          startDate: budgetStartDate,
          endDate: budgetEndDate,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
        });
      }
      
      setBudgets(budgetsList);
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast({
        title: "Error",
        description: "Could not load budgets. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !currentUser.uid) return;
    
    setLoading(true);
    
    // Set up real-time listeners for both budgets and transactions
    const budgetsRef = collection(db, 'budgets');
    const transactionsRef = collection(db, 'transactions');
    
    const budgetsQuery = query(
      budgetsRef,
      where('userId', '==', currentUser.uid)
    );
    
    const transactionsQuery = query(
      transactionsRef,
      where('userId', '==', currentUser.uid),
      where('type', '==', 'expense')
    );
    
    // Listen for real-time updates on both budgets and transactions
    const unsubscribeBudgets = onSnapshot(budgetsQuery, () => {
      loadBudgets();
    });
    
    const unsubscribeTransactions = onSnapshot(transactionsQuery, () => {
      loadBudgets();
    });
    
    // Initial load
    loadBudgets();
    
    return () => {
      unsubscribeBudgets();
      unsubscribeTransactions();
    };
  }, [currentUser]);

  const handleDeleteBudget = async (budgetId: string) => {
    if (!currentUser || !currentUser.uid) return;
    try {
      await deleteDoc(doc(db, 'budgets', budgetId));
      toast({
        title: "Success",
        description: "Budget deleted!"
      });
      // Real-time listener will automatically update the budgets
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: "Error",
        description: "Could not delete budget. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditClose = () => {
    setSelectedBudget(null);
    setIsEditDialogOpen(false);
  };

  // Calculate days remaining for a budget period
  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Calculate time progress percentage
  const getTimeProgress = (startDate: Date, endDate: Date) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  // Export budgets as PDF
  const handleExportBudgetsPDF = async () => {
    if (!budgets.length) {
      toast({
        title: "No Data",
        description: "No budgets found to export."
      });
      return;
    }
    try {
      // Create filter information string
      const filterParts = [];
      if (budgetSearch) filterParts.push(`Search: "${budgetSearch}"`);
      if (categoryFilter !== 'all') filterParts.push(`Category: ${budgetCategories.find(c => c.value === categoryFilter)?.label}`);
      if (periodFilter !== 'all') filterParts.push(`Period: ${periodFilter}`);
      if (dateRange?.from && dateRange?.to) {
        filterParts.push(`Date Range: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`);
      } else if (dateRange?.from) {
        filterParts.push(`Date: ${format(dateRange.from, 'MMM dd, yyyy')}`);
      }
      if (sortBy !== 'latest') {
        const sortLabels = {
          'oldest': 'Oldest Date',
          'name': 'Name (A-Z)',
          'category': 'Category (A-Z)'
        };
        filterParts.push(`Sort: ${sortLabels[sortBy] || 'Latest Date'}`);
      }

      const filterInfo = filterParts.length > 0 ? filterParts.join(' | ') : undefined;
      
      exportBudgetsToPDF(filteredAndSortedBudgets, currentUser?.displayName || 'User', filterInfo);
      toast({
        title: "Success",
        description: "Budgets exported as PDF!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not export budgets. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Export transactions as PDF
  const handleExportTransactionsPDF = async () => {
    if (!currentUser) return;
    try {
      setExportingTransactions(true);
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (transactions.length === 0) {
        toast({
          title: "No Data",
          description: "No transactions found to export",
          variant: "destructive"
        });
        return;
      }
      exportTransactionsToPDF(transactions, currentUser.displayName || 'User');
      toast({
        title: "Success",
        description: "Transactions exported successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export transactions",
        variant: "destructive"
      });
    } finally {
      setExportingTransactions(false);
    }
  };

  // Memoized filtering and sorting for better performance
  const filteredAndSortedBudgets = useMemo(() => {
    // Apply date range filter
    let filtered = (dateRange?.from || dateRange?.to)
      ? budgets.filter(budget => {
          const start = new Date(budget.startDate);
          const end = new Date(budget.endDate);
          if (dateRange?.from && dateRange?.to) {
            return (dateRange.from <= end && dateRange.to >= start);
          } else if (dateRange?.from) {
            return dateRange.from >= start && dateRange.from <= end;
          }
          return true;
        })
      : budgets;

    // Apply search and other filters
    filtered = filtered.filter(budget => {
      const matchesSearch = budget.categoryLabel.toLowerCase().includes(budgetSearch.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || budget.category === categoryFilter;
      const matchesPeriod = periodFilter === 'all' || budget.period === periodFilter;
      return matchesSearch && matchesCategory && matchesPeriod;
    });

    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'latest') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else if (sortBy === 'oldest') {
        return a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortBy === 'name') {
        return (a.categoryLabel || '').localeCompare(b.categoryLabel || '');
      } else if (sortBy === 'category') {
        return (a.category || '').localeCompare(b.category || '');
      }
      return 0;
    });
  }, [budgets, dateRange, budgetSearch, categoryFilter, periodFilter, sortBy]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="animate-fade-in w-full sm:w-auto">
            <h1 className="text-3xl font-bold text-foreground">Budget Management</h1>
            <p className="text-muted-foreground mt-1">
              Set spending limits and track your progress
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
            <Button onClick={handleExportBudgetsPDF} variant="outline" className="w-full sm:w-auto">
              Export Budgets (PDF)
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </Button>
          </div>
        </div>
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search budgets..."
              value={budgetSearch}
              onChange={e => setBudgetSearch(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center border rounded-md px-3 py-2 bg-background hover:bg-accent transition-colors text-sm min-w-[180px]"
              >
                <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                  : dateRange?.from
                    ? format(dateRange.from, 'MMM dd, yyyy')
                    : 'Pick a date'}
                {dateRange?.from && (
                  <X
                    className="w-4 h-4 ml-2 text-muted-foreground cursor-pointer hover:text-destructive"
                    onClick={e => {
                      e.stopPropagation();
                      setDateRange(undefined);
                    }}
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                className="rounded-md border shadow-lg"
              />
            </PopoverContent>
          </Popover>
          {/* Sort By Dropdown */}
          <div className="w-full sm:w-[200px]">
                <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest Date</SelectItem>
                    <SelectItem value="oldest">Oldest Date</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="category">Category (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          {/* Category Dropdown */}
          <div className="w-full sm:w-[200px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {budgetCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          {/* Period Dropdown */}
          <div className="w-full sm:w-[150px]">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Period" />
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
        </div>
        {/* Budgets Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading budgets...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-12">
            <img src="/illustration/RecentBudgets.svg" alt="No budgets" className="w-24 h-24 mx-auto mb-4 animate-float" />
            <h3 className="text-lg font-semibold mb-2">No budgets set</h3>
            <p className="text-muted-foreground mb-4">
              Start by setting a budget for any category
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedBudgets.map((budget) => {
              const progress = (budget.spent / budget.totalLimit) * 100;
              const isOverBudget = progress > 100;
              const daysRemaining = getDaysRemaining(budget.endDate);
              const timeProgress = getTimeProgress(budget.startDate, budget.endDate);
              const borderColor = categoryBorderColors[budget.category] || 'border-gray-200';
              
              return (
                <Card key={budget.id} className={`animate-fade-in border ${borderColor}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-lg">{CATEGORY_ICONS[budget.category]}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{budget.categoryLabel}</h3>
                          <p className="text-sm text-muted-foreground">{budget.periodLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedBudget(budget);
                          setIsEditDialogOpen(true);
                        }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBudget(budget.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spent</span>
                        <span className={isOverBudget ? "text-red-500 font-medium" : ""}>
                          {currency.symbol}{Number(budget.spent || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Limit</span>
                        <span>{currency.symbol}{Number(budget.totalLimit || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Limit</span>
                        <span>{currency.symbol}{Number(budget.monthlyLimit || 0).toLocaleString()}</span>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Budget Progress</span>
                          <span className={isOverBudget ? "text-red-500 font-medium" : ""}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2 mb-2" />
                        
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Time Progress</span>
                          <span>{timeProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={timeProgress} className="h-2" />
                      </div>

                      <div className="mt-4 p-3 rounded-lg bg-accent/50">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Days Remaining</span>
                          <span className="font-medium">{daysRemaining} days</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AddBudgetDialog 
          isOpen={isAddDialogOpen} 
          onClose={() => setIsAddDialogOpen(false)} 
          onBudgetChange={() => {
            // Real-time listener will handle updates
          }}
        />

        {selectedBudget && (
          <EditBudgetDialog
            isOpen={isEditDialogOpen}
            onClose={handleEditClose}
            budget={selectedBudget}
            onUpdate={() => {
              handleEditClose();
              // Real-time listener will handle updates
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default Budget;
