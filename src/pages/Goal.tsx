import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Edit, Trash2, CheckCircle2, Plus, SortAsc, SortDesc } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { exportGoalsToPDF, exportGoalsAndSavingsToPDF } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CATEGORY_ICONS } from '@/components/CategoryIcons';

const goalIcons = [
  <Target className="w-8 h-8 text-primary" />
];

const cardAccentColors = [
  'from-blue-500 to-blue-400',
  'from-yellow-400 to-yellow-300',
  'from-amber-500 to-orange-400',
  'from-purple-500 to-indigo-400',
  'from-pink-500 to-fuchsia-400',
];

const cardBorderColors = [
  'border-blue-200',
  'border-yellow-200',
  'border-amber-200',
  'border-purple-200',
  'border-pink-200',
];

const sortOptions = [
  { value: 'date-desc', label: 'Date (Newest)' },
  { value: 'date-asc', label: 'Date (Oldest)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
];

// Add a helper to normalize Firestore Timestamp or Date
function toDateObj(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (d.seconds) return new Date(d.seconds * 1000);
  if (typeof d.toDate === 'function') return d.toDate();
  return new Date(d);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getEndOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

const Goal: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [savedMoney, setSavedMoney] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalAmount, setEditGoalAmount] = useState('');
  const [editSavedMoney, setEditSavedMoney] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{from: Date|null, to: Date|null}>({from: null, to: null});
  const [addType, setAddType] = useState<'goal' | 'savings'>('goal');
  const [savings, setSavings] = useState<any[]>([]);
  const [savingsProgressMap, setSavingsProgressMap] = useState<Record<string, number>>({});
  const [editSavingId, setEditSavingId] = useState<string | null>(null);
  const [editSavingName, setEditSavingName] = useState('');
  const [editSavingAmount, setEditSavingAmount] = useState('');
  const [editSavingSavedMoney, setEditSavingSavedMoney] = useState('');

  // Load goals
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'goals'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGoals(goalsList);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Load progress for each goal
  const loadProgress = async (goalsList: any[]) => {
    if (!currentUser) return;
    
    // Get all transactions in one query
    const transactionsRef = collection(db, 'transactions');
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
    const newProgressMap: Record<string, number> = {};
    for (const goal of goalsList) {
      const total = goalTotals.get(goal.id) || 0;
      const manualSaved = typeof goal.savedMoney === 'number' ? goal.savedMoney : 0;
      newProgressMap[goal.id] = total + manualSaved;
    }
    
    setProgressMap(newProgressMap);
  };

  useEffect(() => {
    if (goals.length > 0) {
      loadProgress(goals);
    }
  }, [goals]);

  const handleAddGoalOrSaving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalAmount || !currentUser) return;
    if (!currentUser.emailVerified) {
      toast({ title: 'Email Not Verified', description: 'Please verify your email before adding goals or savings.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (addType === 'goal') {
        await addDoc(collection(db, 'goals'), {
          goalName,
          goalAmount: parseFloat(goalAmount),
          savedMoney: savedMoney ? parseFloat(savedMoney) : 0,
          goalCompleted: false,
          createdAt: Timestamp.now(),
          userId: currentUser.uid,
        });
      } else {
        await addDoc(collection(db, 'savings'), {
          savingsName: goalName,
          savingsAmount: parseFloat(goalAmount),
          savedMoney: savedMoney ? parseFloat(savedMoney) : 0,
          savingsCompleted: false,
          createdAt: Timestamp.now(),
          userId: currentUser.uid,
        });
      }
      setGoalName('');
      setGoalAmount('');
      setSavedMoney('');
      setIsDialogOpen(false);
      toast({ title: 'Success', description: addType === 'goal' ? 'Goal added!' : 'Saving added!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (goalId: string, value: boolean) => {
    await updateDoc(doc(db, 'goals', goalId), { goalCompleted: value });
  };

  const handleEditGoal = (goal: any) => {
    setEditGoalId(goal.id);
    setEditGoalName(goal.goalName);
    setEditGoalAmount(goal.goalAmount.toString());
    setEditSavedMoney(goal.savedMoney?.toString() || '');
  };

  const handleSaveEdit = async (goalId: string) => {
    await updateDoc(doc(db, 'goals', goalId), {
      goalName: editGoalName,
      goalAmount: parseFloat(editGoalAmount),
      savedMoney: editSavedMoney ? parseFloat(editSavedMoney) : 0,
      goalCompleted: false,
    });
    setEditGoalId(null);
    setEditGoalName('');
    setEditGoalAmount('');
    setEditSavedMoney('');
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      await deleteDoc(doc(db, 'goals', goalId));
    }
  };

  // Fetch savings for the current user
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'savings'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const savingsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavings(savingsList);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Calculate progress for each saving (real-time)
  useEffect(() => {
    if (!currentUser) return;
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Build a map of savingId -> total transaction amount
      const savingTotals: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.savingId && typeof data.amount === 'number') {
          savingTotals[data.savingId] = (savingTotals[data.savingId] || 0) + data.amount;
        }
      });
      // For each saving, add manual savedMoney and transaction total
      const newProgressMap: Record<string, number> = {};
      for (const saving of savings) {
        const manualSaved = typeof saving.savedMoney === 'number' ? saving.savedMoney : 0;
        newProgressMap[saving.id] = manualSaved + (savingTotals[saving.id] || 0);
      }
      setSavingsProgressMap(newProgressMap);
    });
    return () => unsubscribe();
  }, [currentUser, savings]);

  const handleMarkSavingComplete = async (savingId: string, value: boolean) => {
    await updateDoc(doc(db, 'savings', savingId), { savingsCompleted: value });
  };

  const handleEditSaving = (saving: any) => {
    setEditSavingId(saving.id);
    setEditSavingName(saving.savingsName);
    setEditSavingAmount(saving.savingsAmount.toString());
    setEditSavingSavedMoney(saving.savedMoney?.toString() || '');
  };

  const handleSaveEditSaving = async (savingId: string) => {
    await updateDoc(doc(db, 'savings', savingId), {
      savingsName: editSavingName,
      savingsAmount: parseFloat(editSavingAmount),
      savedMoney: editSavingSavedMoney ? parseFloat(editSavingSavedMoney) : 0,
      savingsCompleted: false,
    });
    setEditSavingId(null);
    setEditSavingName('');
    setEditSavingAmount('');
    setEditSavingSavedMoney('');
  };

  const handleDeleteSaving = async (savingId: string) => {
    if (window.confirm('Are you sure you want to delete this saving?')) {
      await deleteDoc(doc(db, 'savings', savingId));
    }
  };

  // Filtered and sorted goals
  let filteredGoals = goals.filter(goal => {
    // Search
    const matchesSearch = !search || (goal.goalName || '').toLowerCase().includes(search.toLowerCase());
    // Date range
    let matchesDate = true;
    const createdAtDate = toDateObj(goal.createdAt);
    if (dateRange.from && dateRange.to) {
      const from = dateRange.from;
      const to = getEndOfDay(dateRange.to);
      matchesDate = createdAtDate && createdAtDate >= from && createdAtDate <= to;
    } else if (dateRange.from) {
      matchesDate = createdAtDate && isSameDay(createdAtDate, dateRange.from);
    }
    return matchesSearch && matchesDate;
  });

  // Sort
  if (sortBy === 'name-asc') {
    filteredGoals = filteredGoals.sort((a, b) => (a.goalName || '').localeCompare(b.goalName || ''));
  } else if (sortBy === 'name-desc') {
    filteredGoals = filteredGoals.sort((a, b) => (b.goalName || '').localeCompare(a.goalName || ''));
  } else if (sortBy === 'date-desc') {
    filteredGoals = filteredGoals.sort((a, b) => (b.createdAt?.toDate?.() || new Date(b.createdAt)) - (a.createdAt?.toDate?.() || new Date(a.createdAt)));
  } else if (sortBy === 'date-asc') {
    filteredGoals = filteredGoals.sort((a, b) => (a.createdAt?.toDate?.() || new Date(a.createdAt)) - (b.createdAt?.toDate?.() || new Date(b.createdAt)));
  }

  // Filtered and sorted savings
  let filteredSavings = savings.filter(saving => {
    // Search
    const matchesSearch = !search || (saving.savingsName || '').toLowerCase().includes(search.toLowerCase());
    // Date range
    let matchesDate = true;
    const createdAtDate = toDateObj(saving.createdAt);
    if (dateRange.from && dateRange.to) {
      const from = dateRange.from;
      const to = getEndOfDay(dateRange.to);
      matchesDate = createdAtDate && createdAtDate >= from && createdAtDate <= to;
    } else if (dateRange.from) {
      matchesDate = createdAtDate && isSameDay(createdAtDate, dateRange.from);
    }
    return matchesSearch && matchesDate;
  });

  // Sort
  if (sortBy === 'name-asc') {
    filteredSavings = filteredSavings.sort((a, b) => (a.savingsName || '').localeCompare(b.savingsName || ''));
  } else if (sortBy === 'name-desc') {
    filteredSavings = filteredSavings.sort((a, b) => (b.savingsName || '').localeCompare(a.savingsName || ''));
  } else if (sortBy === 'date-desc') {
    filteredSavings = filteredSavings.sort((a, b) => (b.createdAt?.toDate?.() || new Date(b.createdAt)) - (a.createdAt?.toDate?.() || new Date(a.createdAt)));
  } else if (sortBy === 'date-asc') {
    filteredSavings = filteredSavings.sort((a, b) => (a.createdAt?.toDate?.() || new Date(a.createdAt)) - (b.createdAt?.toDate?.() || new Date(b.createdAt)));
  }

  return (
    <Layout>
      <TooltipProvider>
        <div className="max-w-6xl mx-auto py-10 px-4 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="animate-fade-in w-full sm:w-auto">
              <h1 className="text-3xl font-bold text-foreground">Financial Goals & Savings</h1>
              <p className="text-muted-foreground mt-1">
                Set targets and track your Goal & savings progress.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
              <Button
                onClick={() => {
                  if (!goals.length && !savings.length) {
                    toast({ title: 'No Data', description: 'No goals or savings found to export.' });
                    return;
                  }
                  try {
                    // Create filter information string
                    const filterParts = [];
                    if (search) filterParts.push(`Search: "${search}"`);
                    if (dateRange.from && dateRange.to) {
                      filterParts.push(`Date Range: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`);
                    } else if (dateRange.from) {
                      filterParts.push(`Date: ${dateRange.from.toLocaleDateString()}`);
                    }
                    if (sortBy !== 'date-desc') {
                      const sortLabels = {
                        'date-asc': 'Oldest Date',
                        'name-asc': 'Name (A-Z)',
                        'name-desc': 'Name (Z-A)'
                      };
                      filterParts.push(`Sort: ${sortLabels[sortBy] || 'Latest Date'}`);
                    }

                    const filterInfo = filterParts.length > 0 ? filterParts.join(' | ') : undefined;
                    
                    if (filteredGoals.length && !filteredSavings.length) {
                      exportGoalsToPDF(filteredGoals, currentUser?.displayName || 'User', filterInfo);
                    } else if (!filteredGoals.length && filteredSavings.length) {
                      exportGoalsAndSavingsToPDF([], filteredSavings, currentUser?.displayName || 'User', filterInfo);
                    } else {
                      exportGoalsAndSavingsToPDF(filteredGoals, filteredSavings, currentUser?.displayName || 'User', filterInfo);
                    }
                    toast({ title: 'Success', description: 'Goals & Savings exported to PDF!' });
                  } catch (error) {
                    toast({ title: 'Error', description: 'Failed to export goals & savings.', variant: 'destructive' });
                  }
                }}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Export Goals & Savings (PDF)
              </Button>
              <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Goal or Savings
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search goals or savings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center border rounded-md px-3 py-2 bg-background hover:bg-accent transition-colors text-sm min-w-[180px]"
                >
                  <Target className="w-4 h-4 mr-2 text-muted-foreground" />
                  {dateRange.from && dateRange.to
                    ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    : dateRange.from
                      ? dateRange.from.toLocaleDateString()
                      : 'Pick a date'}
                  {dateRange.from && (
                    <span
                      className="w-4 h-4 ml-2 text-muted-foreground cursor-pointer hover:text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        setDateRange({from: null, to: null});
                      }}
                    >✕</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={range => setDateRange({from: range?.from || null, to: range?.to || null})}
                  numberOfMonths={1}
                  className="rounded-md border shadow-lg"
                />
              </PopoverContent>
            </Popover>
            {/* Sort By Dropdown */}
            <div className="w-full sm:w-[200px]">
              <Select value={sortBy} onValueChange={v => setSortBy(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Latest Date</SelectItem>
                  <SelectItem value="date-asc">Oldest Date</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Empty state for no goals and no savings */}
          {filteredGoals.length === 0 && filteredSavings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <img src="/illustration/goal.svg" alt="No goals or savings" className="w-24 h-24 mb-4 animate-float" />
              <div className="text-xl font-semibold mb-2">No Goals or Savings Yet</div>
              <div className="mb-4">Start by adding your first goal or saving to track your progress!</div>
              <Button
                className="px-4 py-2 rounded-full bg-primary text-white font-medium shadow hover:bg-primary/90 flex items-center gap-2"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Goal or Savings
              </Button>
            </div>
          )}
          {/* Goals Section */}
          {filteredGoals.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Goals</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 auto-rows-[minmax(260px,auto)]">
                {filteredGoals.map((goal, idx) => {
                  const progress = progressMap[goal.id] || 0;
                  const percent = Math.min(100, (progress / (goal.goalAmount || 1)) * 100);
                  const isEditing = editGoalId === goal.id;
                  const borderColor = cardBorderColors[idx % cardBorderColors.length];
                  return (
                    <div
                      key={goal.id}
                      className={`relative flex flex-col rounded-2xl shadow-lg bg-background border ${borderColor} transition-transform hover:scale-[1.03] hover:shadow-2xl overflow-hidden ${goal.goalCompleted ? 'bg-green-50' : ''}`}
                      style={{ minHeight: 280 }}
                    >
                      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-2">
                        <div className="mb-4 flex justify-center">
                          {goal.goalCompleted ? (
                            <img src="/illustration/complete.svg" alt="Completed" className="w-full h-40 mb-2 animate-float object-contain" style={{ maxWidth: '320px' }} />
                          ) : (
                            <Target className="w-8 h-8 text-primary" />
                          )}
                        </div>
                        {goal.goalCompleted && <Badge variant="secondary" className="bg-green-100 text-green-700 absolute left-4 top-4">Completed</Badge>}
                        {isEditing ? (
                          <>
                            <div className="w-full mb-2">
                              <Label htmlFor={`edit-goal-name-${goal.id}`}>Goal Name</Label>
                              <Input id={`edit-goal-name-${goal.id}`} className="mb-2" placeholder="Goal Name" value={editGoalName} onChange={e => setEditGoalName(e.target.value)} />
                            </div>
                            <div className="w-full mb-2">
                              <Label htmlFor={`edit-goal-amount-${goal.id}`}>Goal Amount</Label>
                              <Input
                                id={`edit-goal-amount-${goal.id}`}
                                className="mb-2"
                                type="number"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                value={editGoalAmount}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*\.?\d*$/.test(val) || val === '') {
                                    setEditGoalAmount(val);
                                  }
                                }}
                                placeholder="Goal Amount"
                              />
                            </div>
                            <div className="w-full mb-2">
                              <Label htmlFor={`edit-saved-money-${goal.id}`}>Saved Money (Optional)</Label>
                              <Input
                                id={`edit-saved-money-${goal.id}`}
                                className="mb-2"
                                type="number"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                value={editSavedMoney}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*\.?\d*$/.test(val) || val === '') {
                                    setEditSavedMoney(val);
                                  }
                                }}
                                placeholder="Saved Money"
                              />
                              <div className="text-xs text-muted-foreground mt-1">Total Saved (manual + transactions): <span className="font-semibold">{progressMap[goal.id] || 0}</span></div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" onClick={() => handleSaveEdit(goal.id)}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditGoalId(null)}>Cancel</Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <h2 className="text-xl font-semibold text-center mb-1">{goal.goalName}</h2>
                            <div className="text-sm text-muted-foreground mb-2">Target: <span className="font-medium">{goal.goalAmount}</span></div>
                            <Progress value={percent} className="h-3 mb-2" />
                            <div className="flex justify-between w-full text-xs text-muted-foreground mb-2">
                              <span>Saved: {progress}</span>
                              <span>{percent.toFixed(1)}%</span>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Action buttons row at the bottom */}
                      <div className="flex gap-4 p-4 w-full justify-center bg-background border-t border-border mt-auto">
                        {goal.goalCompleted && !isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-100" onClick={() => handleMarkComplete(goal.id, false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Undo Complete</TooltipContent>
                          </Tooltip>
                        )}
                        {!goal.goalCompleted && !isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-100" onClick={() => handleMarkComplete(goal.id, true)}>
                                <CheckCircle2 className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark as Complete</TooltipContent>
                          </Tooltip>
                        )}
                        {!isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => handleEditGoal(goal)}>
                                <Edit className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        )}
                        {!isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDeleteGoal(goal.id)}>
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Savings Section */}
          {filteredSavings.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl font-bold mb-6">Savings</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 auto-rows-[minmax(260px,auto)]">
                {filteredSavings.map((saving, idx) => {
                  const progress = savingsProgressMap[saving.id] || 0;
                  const percent = Math.min(100, (progress / (saving.savingsAmount || 1)) * 100);
                  const isEditing = editSavingId === saving.id;
                  const borderColor = cardBorderColors[idx % cardBorderColors.length];
                  return (
                    <div
                      key={saving.id}
                      className={`relative flex flex-col rounded-2xl shadow-lg bg-background border ${borderColor} transition-transform hover:scale-[1.03] hover:shadow-2xl overflow-hidden ${saving.savingsCompleted ? 'bg-green-50' : ''}`}
                      style={{ minHeight: 280 }}
                    >
                      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-2">
                        <div className="mb-4 flex justify-center">
                          {saving.savingsCompleted ? (
                            <img src="/illustration/complete.svg" alt="Completed" className="w-full h-40 mb-2 animate-float object-contain" style={{ maxWidth: '320px' }} />
                          ) : (
                            CATEGORY_ICONS[saving?.category || 'savings']
                          )}
                        </div>
                        {saving.savingsCompleted && <Badge variant="secondary" className="bg-green-100 text-green-700 absolute left-4 top-4">Completed</Badge>}
                        {isEditing ? (
                          <>
                            <div className="w-full mb-2">
                              <Label htmlFor={`edit-saving-name-${saving.id}`}>Saving Name</Label>
                              <Input id={`edit-saving-name-${saving.id}`} className="mb-2" placeholder="Saving Name" value={editSavingName} onChange={e => setEditSavingName(e.target.value)} />
                            </div>
                            <div className="w-full mb-2">
                              <Label htmlFor={`edit-saving-amount-${saving.id}`}>Target Amount</Label>
                              <Input
                                id={`edit-saving-amount-${saving.id}`}
                                className="mb-2"
                                type="number"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                value={editSavingAmount}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*\.?\d*$/.test(val) || val === '') {
                                    setEditSavingAmount(val);
                                  }
                                }}
                                placeholder="Target Amount"
                              />
                            </div>
                            <div className="w-full mb-2">
                              <Label htmlFor={`edit-saving-saved-money-${saving.id}`}>Saved Amount (Optional)</Label>
                              <Input
                                id={`edit-saving-saved-money-${saving.id}`}
                                className="mb-2"
                                type="number"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                value={editSavingSavedMoney}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (/^\d*\.?\d*$/.test(val) || val === '') {
                                    setEditSavingSavedMoney(val);
                                  }
                                }}
                                placeholder="Saved Amount"
                              />
                              <div className="text-xs text-muted-foreground mt-1">Total Saved: <span className="font-semibold">{progress}</span></div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" onClick={() => handleSaveEditSaving(saving.id)}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditSavingId(null)}>Cancel</Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <h2 className="text-xl font-semibold text-center mb-1">{saving.savingsName}</h2>
                            <div className="text-sm text-muted-foreground mb-2">Target: <span className="font-medium">{saving.savingsAmount}</span></div>
                            <Progress value={percent} className="h-3 mb-2" />
                            <div className="flex justify-between w-full text-xs text-muted-foreground mb-2">
                              <span>Saved: {progress}</span>
                              <span>{percent.toFixed(1)}%</span>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Action buttons row at the bottom */}
                      <div className="flex gap-4 p-4 w-full justify-center bg-background border-t border-border mt-auto">
                        {saving.savingsCompleted && !isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-100" onClick={() => handleMarkSavingComplete(saving.id, false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Undo Complete</TooltipContent>
                          </Tooltip>
                        )}
                        {!saving.savingsCompleted && !isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-100" onClick={() => handleMarkSavingComplete(saving.id, true)}>
                                <CheckCircle2 className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark as Complete</TooltipContent>
                          </Tooltip>
                        )}
                        {!isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => handleEditSaving(saving)}>
                                <Edit className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        )}
                        {!isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDeleteSaving(saving.id)}>
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>

      {/* Add Goal or Savings Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a New Goal or Savings</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className={`px-4 py-1 rounded-full border text-sm font-medium transition-colors focus:outline-none ${addType === 'goal' ? 'bg-primary text-white border-primary' : 'bg-transparent text-foreground border-border hover:bg-accent'}`}
              onClick={() => setAddType('goal')}
            >
              Goal
            </button>
            <button
              type="button"
              className={`px-4 py-1 rounded-full border text-sm font-medium transition-colors focus:outline-none ${addType === 'savings' ? 'bg-primary text-white border-primary' : 'bg-transparent text-foreground border-border hover:bg-accent'}`}
              onClick={() => setAddType('savings')}
            >
              Savings
            </button>
          </div>
          <form onSubmit={handleAddGoalOrSaving} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="goalName">{addType === 'goal' ? 'Goal Name' : 'Saving Name'}</Label>
              <Input id="goalName" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder={addType === 'goal' ? 'e.g. Emergency Fund' : 'e.g. Emergency Fund'} required />
            </div>
            <div>
              <Label htmlFor="goalAmount">{addType === 'goal' ? 'Goal Amount' : 'Target Amount'}</Label>
              <Input
                id="goalAmount"
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                value={goalAmount}
                onChange={e => {
                  // Only allow numbers and dot
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val) || val === '') {
                    setGoalAmount(val);
                  }
                }}
                placeholder={addType === 'goal' ? 'e.g. 1000' : 'e.g. 1000'}
                required
              />
            </div>
            <div>
              <Label htmlFor="savedMoney">Saved Amount (Optional)</Label>
              <Input
                id="savedMoney"
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                value={savedMoney}
                onChange={e => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val) || val === '') {
                    setSavedMoney(val);
                  }
                }}
                placeholder="e.g. 200"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Saving...' : (addType === 'goal' ? 'Add Goal' : 'Add Savings')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Goal; 