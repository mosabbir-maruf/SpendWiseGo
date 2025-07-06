import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';

const categories = [
  { value: 'food', label: 'Food & Dining', color: '#FF6B6B' },
  { value: 'transport', label: 'Transportation', color: '#4ECDC4' },
  { value: 'shopping', label: 'Shopping', color: '#45B7D1' },
  { value: 'entertainment', label: 'Entertainment', color: '#96CEB4' },
  { value: 'health', label: 'Health & Medical', color: '#FFEAA7' },
  { value: 'education', label: 'Education', color: '#DDA0DD' },
  { value: 'bills', label: 'Bills & Utilities', color: '#98D8C8' },
  { value: 'salary', label: 'Salary', color: '#4CAF50' },
  { value: 'other', label: 'Other', color: '#F7DC6F' },
];

// Add prop type
interface TransactionChartProps {
  chartType?: 'pie' | 'bar';
  selectedMonth?: Date;
}

const TransactionChart: React.FC<TransactionChartProps> = ({ chartType, selectedMonth }): JSX.Element => {
  const { currentUser } = useAuth();
  const { currency } = useCurrency();
  const [pieData, setPieData] = useState<any[]>([]);
  const [barData, setBarData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    const transactionsRef = collection(db, 'transactions');
    const monthDate = selectedMonth || new Date();
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    // Pie chart: expenses by category for selected month
    const expenseQuery = query(
      transactionsRef,
      where('userId', '==', currentUser.uid),
      where('type', '==', 'expense'),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth),
      orderBy('date', 'desc')
    );
    
    // Bar chart: daily income/expenses for selected month
    const barQuery = query(
      transactionsRef,
      where('userId', '==', currentUser.uid),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth),
      orderBy('date', 'desc')
    );

    // Set up real-time listeners
    const unsubscribeExpense = onSnapshot(expenseQuery, (expenseSnapshot) => {
      // Group expenses by category
      const categoryTotals: { [key: string]: number } = {};
      expenseSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'other';
        categoryTotals[category] = (categoryTotals[category] || 0) + data.amount;
      });
      const pieChartData = categories
        .map(cat => ({
          name: cat.label,
          value: categoryTotals[cat.value] || 0,
          color: cat.color
        }))
        .filter(item => item.value > 0);
      setPieData(pieChartData);
    });

    const unsubscribeBar = onSnapshot(barQuery, (barSnapshot) => {
      // Group by day for the selected month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dailyIncome = new Array(daysInMonth).fill(0);
      const dailyExpense = new Array(daysInMonth).fill(0);
      const hasData = new Array(daysInMonth).fill(false);
      
      barSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date.toDate();
        const day = date.getDate();
        const dayIdx = day - 1; // 0-based index
        hasData[dayIdx] = true;
        if (data.type === 'income') dailyIncome[dayIdx] += data.amount;
        else if (data.type === 'expense') dailyExpense[dayIdx] += data.amount;
      });
      
      const barDataArr = dailyIncome.map((income, i) => {
        const dayDate = new Date(year, month, i + 1);
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        return {
          name: dayName,
          income: income,
          expense: dailyExpense[i]
        };
      }).filter((_, i) => hasData[i]); // Only show days with data
      setBarData(barDataArr);
      setLoading(false);
    });

    // Return cleanup function
    return () => {
      unsubscribeExpense();
      unsubscribeBar();
    };
  }, [currentUser, selectedMonth]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {currency.symbol}{entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-fade-in">
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading charts...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expense Categories Pie Chart */}
      {(!chartType || chartType === 'pie') && (
        <Card className="animate-fade-in">
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${currency.symbol}${value}`, 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <img src="/illustration/pie-chart.svg" alt="No spending by category data" className="w-40 h-40 mb-4 animate-float" />
                <p className="text-muted-foreground">No expense data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Income vs Expenses */}
      {(!chartType || chartType === 'bar') && (
        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" fill="#22C55E" name="Income" />
                  <Bar dataKey="expense" fill="#EF4444" name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <img src="/illustration/weekly-overview.svg" alt="No daily overview data" className="w-40 h-40 mb-4 animate-float-small" />
                <p className="text-muted-foreground">No daily overview data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TransactionChart;
