import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, TrendingUp, TrendingDown, Wallet, CreditCard, Banknote, Smartphone } from 'lucide-react';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import EditTransactionDialog from '@/components/EditTransactionDialog';
import { format } from 'date-fns';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy, Timestamp, DocumentData, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { exportTransactionsToPDF } from '@/utils/exportUtils';
import { CATEGORY_ICONS } from '@/components/CategoryIcons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface TransactionData {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  date: Date;
  notes: string;
  tag: string;
  paymentMethod: string;
  goalId?: string;
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  cash: <Wallet className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
  bank: <Banknote className="w-4 h-4" />,
  digital: <Smartphone className="w-4 h-4" />,
  other: <Wallet className="w-4 h-4" />,
};

const Transactions: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const [sortBy, setSortBy] = useState('latest');
  const [exportingTransactions, setExportingTransactions] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const categories = [
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

  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    const transactionsRef = collection(db, 'transactions');
    
    const q = query(
      transactionsRef,
      where('userId', '==', currentUser.uid),
      orderBy('date', 'desc')
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('Query executed, documents:', querySnapshot.size);
      
      const transactionsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          type: data.type as 'income' | 'expense',
          amount: Number(data.amount),
          category: data.category,
          categoryLabel: data.categoryLabel,
          categoryIcon: data.categoryIcon,
          date: data.date?.toDate() || new Date(),
          notes: data.notes || '',
          tag: data.tag || '',
          paymentMethod: data.paymentMethod,
          goalId: data.goalId,
        } as TransactionData;
      });
      
      console.log('Processed transactions:', transactionsList);
      
      // Apply filters in memory
      let filtered = transactionsList;
      
      if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
      }
      
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === categoryFilter);
      }
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(t => 
          t.categoryLabel.toLowerCase().includes(search) ||
          t.notes.toLowerCase().includes(search) ||
          t.tag.toLowerCase().includes(search)
        );
      }
      
      if (dateRange?.from && dateRange?.to) {
        filtered = filtered.filter(t => {
          const tDateRange = new Date(t.date).getTime();
          return tDateRange >= dateRange.from.getTime() && tDateRange <= dateRange.to.getTime();
        });
      } else if (dateRange?.from) {
        filtered = filtered.filter(t => {
          const tDateSingle = new Date(t.date);
          return tDateSingle.getFullYear() === dateRange.from.getFullYear() &&
                 tDateSingle.getMonth() === dateRange.from.getMonth() &&
                 tDateSingle.getDate() === dateRange.from.getDate();
        });
      }
      
      setTransactions(filtered);
      setLoading(false);
    }, (error) => {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Could not load transactions. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, typeFilter, categoryFilter, searchTerm, dateRange]);

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!currentUser) return;
    try {
      // Just delete the transaction; do not update savedMoney in the goal
      await deleteDoc(doc(db, 'transactions', transactionId));
      toast({
        title: "Success",
        description: "Transaction deleted!"
      });
      // Real-time listener will automatically update the transactions
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Could not delete transaction. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditClick = (transaction: TransactionData) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setSelectedTransaction(null);
    setIsEditDialogOpen(false);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = (transaction.categoryLabel?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (transaction.notes?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      const tDateRange = new Date(transaction.date).getTime();
      matchesDate = tDateRange >= dateRange.from.getTime() && tDateRange <= dateRange.to.getTime();
    } else if (dateRange?.from) {
      const tDateSingle = new Date(transaction.date);
      matchesDate = tDateSingle.getFullYear() === dateRange.from.getFullYear() &&
                   tDateSingle.getMonth() === dateRange.from.getMonth() &&
                   tDateSingle.getDate() === dateRange.from.getDate();
    }
    return matchesSearch && matchesCategory && matchesType && matchesDate;
  });

  // Sort filteredTransactions based on sortBy
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'latest') {
      return b.date.getTime() - a.date.getTime();
    } else if (sortBy === 'oldest') {
      return a.date.getTime() - b.date.getTime();
    } else if (sortBy === 'name') {
      return (a.notes || '').localeCompare(b.notes || '');
    } else if (sortBy === 'category') {
      return (a.categoryLabel || '').localeCompare(b.categoryLabel || '');
    }
    return 0;
  });

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    // Real-time listener will automatically update the transactions
  };

  // Export transactions as PDF
  const handleExportTransactionsPDF = async () => {
    if (!currentUser) return;
    try {
      setExportingTransactions(true);
      
      // Use the filtered and sorted transactions that are currently displayed
      if (sortedTransactions.length === 0) {
        toast({
          title: "No Data",
          description: "No transactions found to export."
        });
        return;
      }

      // Create filter information string
      const filterParts = [];
      if (searchTerm) filterParts.push(`Search: "${searchTerm}"`);
      if (categoryFilter !== 'all') filterParts.push(`Category: ${categories.find(c => c.value === categoryFilter)?.label}`);
      if (typeFilter !== 'all') filterParts.push(`Type: ${typeFilter}`);
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
      
      exportTransactionsToPDF(sortedTransactions, currentUser.displayName || 'User', filterInfo);
      toast({
        title: "Success",
        description: "Transactions exported as PDF!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not export transactions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setExportingTransactions(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="animate-fade-in w-full sm:w-auto">
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground mt-1">
              Manage your income and expenses
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
            <Button onClick={handleExportTransactionsPDF} variant="outline" disabled={exportingTransactions} className="w-full sm:w-auto">
              Export Transactions (PDF)
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search Input First */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              {/* Date Range Picker Popover (after search) */}
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
              {/* End Date Range Picker Popover */}
              {/* Sort By Dropdown */}
              <div className="w-full md:w-[200px]">
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
              {/* End Sort By Dropdown */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : sortedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <img src="/illustration/transactions.svg" alt="No transactions" className="w-24 h-24 mx-auto mb-4 animate-float" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || categoryFilter !== 'all' || typeFilter !== 'all'
                    ? "Try adjusting your filters"
                    : "Start by adding your first transaction"
                  }
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTransactions.map((transaction) => {
                  const borderColor = categoryBorderColors[transaction.category] || 'border-gray-300';
                  return (
                    <div
                      key={transaction.id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border ${borderColor} hover:bg-accent/50 transition-colors`}
                    >
                      {/* Top row: icon/category/date (left), amount (right) */}
                      <div className="flex w-full justify-between items-start">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                            <span className="text-xl">{CATEGORY_ICONS[transaction.category]}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold">{transaction.categoryLabel}</h3>
                              {transaction.tag && (
                                <Badge variant="secondary" className="text-xs">
                                  {transaction.tag}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(transaction.date, 'MMM dd, yyyy p')}
                            </p>
                            {transaction.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {transaction.notes}
                              </p>
                            )}
                            <Badge variant="outline" className="text-xs mt-1">
                              {paymentMethodIcons[transaction.paymentMethod?.toLowerCase?.()] || paymentMethodIcons.other}
                            </Badge>
                          </div>
                        </div>
                        {/* Amount area */}
                        <div className="flex flex-col items-end ml-2 min-w-[100px]">
                          <div className={`font-bold text-base sm:text-sm flex items-center px-3 py-1 rounded-md bg-accent/40 mb-1 ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="w-4 h-4 mr-1" />
                            ) : (
                              <TrendingDown className="w-4 h-4 mr-1" />
                            )}
                            {transaction.type === 'income' ? '+' : '-'}{currency.symbol}{transaction.amount}
                          </div>
                          <div className="flex gap-1 mt-1">
                            <Button variant="ghost" size="icon" className="p-1" onClick={() => handleEditClick(transaction)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="p-1" onClick={() => handleDeleteTransaction(transaction.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <AddTransactionDialog 
          isOpen={isAddDialogOpen} 
          onClose={handleDialogClose}
        />

        {selectedTransaction && (
          <EditTransactionDialog
            isOpen={isEditDialogOpen}
            onClose={handleEditClose}
            transaction={selectedTransaction}
            onUpdate={() => {
              // Real-time listener will automatically update the transactions
              handleEditClose();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default Transactions;
