import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';

// Website theme colors and styling
const THEME_COLORS = {
  primary: [59, 130, 246] as [number, number, number], // Blue-500
  secondary: [107, 114, 128] as [number, number, number], // Gray-500
  accent: [236, 72, 153] as [number, number, number], // Pink-500
  background: [255, 255, 255] as [number, number, number], // White
  text: [17, 24, 39] as [number, number, number], // Gray-900
  textSecondary: [107, 114, 128] as [number, number, number], // Gray-500
  border: [229, 231, 235] as [number, number, number], // Gray-200
  success: [34, 197, 94] as [number, number, number], // Green-500
  warning: [245, 158, 11] as [number, number, number], // Yellow-500
  error: [239, 68, 68] as [number, number, number], // Red-500
  tableHeader: [248, 250, 252] as [number, number, number], // Gray-50 for table headers
};

const THEME_FONTS = {
  heading: 'helvetica',
  body: 'helvetica',
  size: {
    heading: 20,
    subheading: 16,
    body: 12,
    small: 10,
    caption: 8,
  }
};

// Helper function to set text color
const setTextColor = (doc: jsPDF, color: [number, number, number]) => {
  doc.setTextColor(color[0], color[1], color[2]);
};

// Helper function to set draw color
const setDrawColor = (doc: jsPDF, color: [number, number, number]) => {
  doc.setDrawColor(color[0], color[1], color[2]);
};

export const exportTransactionsToPDF = (transactions: any[], userName?: string, filterInfo?: string) => {
  const doc = new jsPDF();
  
  // Header with website theme styling
  doc.setFontSize(THEME_FONTS.size.heading);
  setTextColor(doc, THEME_COLORS.text);
  doc.setFont(THEME_FONTS.heading, 'bold');
  doc.text('Transaction Report', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
  
  // Subtitle: SpendWiseGo - Expense Tracker
  doc.setFontSize(THEME_FONTS.size.caption + 1);
  setTextColor(doc, THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text('SpendWiseGo - Expense Tracker', doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });
  
  // Add filter information if provided
  if (filterInfo) {
    doc.setFontSize(THEME_FONTS.size.small);
    setTextColor(doc, THEME_COLORS.textSecondary);
    doc.setFont(THEME_FONTS.body, 'normal');
    doc.text(`Filter: ${filterInfo}`, 20, 45);
  }
  
  // Table
  const tableColumn = ['Date', 'Type', 'Category', 'Amount', 'Payment Method'];
  const sortedTransactions = [...transactions].sort((a, b) => {
    let dateA = a.date;
    let dateB = b.date;
    if (dateA && dateA.seconds) dateA = new Date(dateA.seconds * 1000);
    else if (dateA && dateA.toDate) dateA = dateA.toDate();
    else if (dateA && dateA instanceof Date) dateA = dateA;
    else dateA = new Date(dateA);
    if (dateB && dateB.seconds) dateB = new Date(dateB.seconds * 1000);
    else if (dateB && dateB.toDate) dateB = dateB.toDate();
    else if (dateB && dateB instanceof Date) dateB = dateB;
    else dateB = new Date(dateB);
    return dateB.getTime() - dateA.getTime();
  });
  
  const tableRows = sortedTransactions.map(transaction => [
    (() => {
      let d = transaction.date;
      if (d && d.seconds) d = new Date(d.seconds * 1000);
      else if (d && d.toDate) d = d.toDate();
      else if (d && d instanceof Date) d = d;
      else d = new Date(d);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
    })(),
    transaction.type,
    transaction.categoryLabel || transaction.category,
    `BDT ${Number(transaction.amount).toLocaleString()}`,
    transaction.paymentMethod || 'N/A'
  ]);
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: filterInfo ? 55 : 40,
    theme: 'grid',
    headStyles: { 
      fillColor: [44, 62, 80], // #2c3e50
      textColor: 255, // white
      fontStyle: 'bold',
      fontSize: THEME_FONTS.size.body,
      font: THEME_FONTS.heading,
      halign: 'left'
    },
    bodyStyles: { 
      fillColor: THEME_COLORS.background, 
      textColor: THEME_COLORS.text[0],
      fontSize: THEME_FONTS.size.small,
      font: THEME_FONTS.body
    },
    alternateRowStyles: { 
      fillColor: [248, 250, 252] // Gray-50
    },
    styles: { 
      font: THEME_FONTS.body, 
      fontSize: THEME_FONTS.size.small, 
      cellPadding: 4 
    },
    margin: { left: 20, right: 20 },
  });
  
  // Footer with website theme styling
  const finalY = (doc as any).lastAutoTable.finalY || 60;
  doc.setFontSize(THEME_FONTS.size.small);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text(`Generated for: ${userName || 'User'}`, 20, finalY + 16);
  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
  doc.text(`Date: ${formattedDate}`, 20, finalY + 24);
  doc.save(`transactions-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportBudgetReportToPDF = (userName?: string) => {
  const doc = new jsPDF();
  
  // Header with website theme styling
  doc.setFontSize(THEME_FONTS.size.heading);
  doc.setTextColor(...THEME_COLORS.text);
  doc.setFont(THEME_FONTS.heading, 'bold');
  doc.text('Budget Analysis Report', 20, 30);
  
  // Subtitle
  doc.setFontSize(THEME_FONTS.size.body);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text(`Generated for: ${userName || 'User'}`, 20, 45);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 55);
  
  // Line separator with theme color
  doc.setLineWidth(0.5);
  doc.setDrawColor(...THEME_COLORS.border);
  doc.line(20, 75, 190, 75);
  
  // Content with website theme styling
  doc.setFontSize(THEME_FONTS.size.subheading);
  doc.setTextColor(...THEME_COLORS.text);
  doc.setFont(THEME_FONTS.heading, 'bold');
  doc.text('Budget Summary', 20, 95);
  
  doc.setFontSize(THEME_FONTS.size.body);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text('• This is a comprehensive budget analysis report', 20, 115);
  doc.text('• Track your spending across different categories', 20, 125);
  doc.text('• Monitor progress against your set budget limits', 20, 135);
  doc.text('• Identify areas for financial improvement', 20, 145);
  
  doc.setFontSize(THEME_FONTS.size.subheading);
  doc.setTextColor(...THEME_COLORS.text);
  doc.setFont(THEME_FONTS.heading, 'bold');
  doc.text('Key Insights:', 20, 165);
  
  doc.setFontSize(THEME_FONTS.size.body);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text('• Review your budget categories regularly', 20, 180);
  doc.text('• Set realistic spending limits', 20, 190);
  doc.text('• Track expenses consistently', 20, 200);
  doc.text('• Adjust budgets based on actual spending patterns', 20, 210);
  
  // Footer with website theme styling
  doc.setFontSize(THEME_FONTS.size.caption);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text('Page 1 of 1', 170, 285);
  doc.text('Generated by SpendWiseGo', 20, 285);
  
  doc.save(`budget-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportBudgetsToPDF = (budgets, userName = 'User', filterInfo?: string) => {
  const doc = new jsPDF();
  
  // Header with website theme styling
  doc.setFontSize(THEME_FONTS.size.heading);
  doc.setTextColor(...THEME_COLORS.text);
  doc.setFont(THEME_FONTS.heading, 'bold');
  doc.text('Budget Report', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
  
  // Subtitle: SpendWiseGo - Expense Tracker
  doc.setFontSize(THEME_FONTS.size.caption + 1);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text('SpendWiseGo - Expense Tracker', doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });
  
  // Add filter information if provided
  if (filterInfo) {
    doc.setFontSize(THEME_FONTS.size.small);
    doc.setTextColor(...THEME_COLORS.textSecondary);
    doc.setFont(THEME_FONTS.body, 'normal');
    doc.text(`Filter: ${filterInfo}`, 20, 45);
  }
  
  // Table
  const tableColumn = [
    'Category',
    'Period',
    'Monthly Limit',
    'Total Limit',
    'Spent',
    'Start Date',
    'End Date'
  ];
  const sortedBudgets = [...budgets].sort((a, b) => {
    let dateA = a.endDate;
    let dateB = b.endDate;
    if (dateA && dateA.seconds) dateA = new Date(dateA.seconds * 1000);
    else if (dateA && dateA.toDate) dateA = dateA.toDate();
    else if (dateA && dateA instanceof Date) dateA = dateA;
    else dateA = dateA ? new Date(dateA) : new Date(0);
    if (dateB && dateB.seconds) dateB = new Date(dateB.seconds * 1000);
    else if (dateB && dateB.toDate) dateB = dateB.toDate();
    else if (dateB && dateB instanceof Date) dateB = dateB;
    else dateB = dateB ? new Date(dateB) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
  const tableRows = sortedBudgets.map(b => [
    b.categoryLabel,
    b.periodLabel,
    `BDT ${Number(b.monthlyLimit).toLocaleString()}`,
    `BDT ${Number(b.totalLimit).toLocaleString()}`,
    `BDT ${Number(b.spent).toLocaleString()}`,
    (() => {
      let d = b.startDate;
      if (d && d.seconds) d = new Date(d.seconds * 1000);
      else if (d && d.toDate) d = d.toDate();
      else if (d && d instanceof Date) d = d;
      else d = d ? new Date(d) : '';
      return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}` : '';
    })(),
    (() => {
      let d = b.endDate;
      if (d && d.seconds) d = new Date(d.seconds * 1000);
      else if (d && d.toDate) d = d.toDate();
      else if (d && d instanceof Date) d = d;
      else d = d ? new Date(d) : '';
      return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}` : '';
    })()
  ]);
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: filterInfo ? 55 : 40,
    theme: 'grid',
    headStyles: { 
      fillColor: [44, 62, 80], // #2c3e50
      textColor: 255, // white
      fontStyle: 'bold',
      fontSize: THEME_FONTS.size.body,
      font: THEME_FONTS.heading,
      halign: 'left'
    },
    bodyStyles: { 
      fillColor: THEME_COLORS.background, 
      textColor: THEME_COLORS.text[0],
      fontSize: THEME_FONTS.size.small,
      font: THEME_FONTS.body
    },
    alternateRowStyles: { 
      fillColor: [248, 250, 252] // Gray-50
    },
    styles: { 
      font: THEME_FONTS.body, 
      fontSize: THEME_FONTS.size.small, 
      cellPadding: 4 
    },
    margin: { left: 20, right: 20 },
  });
  
  // Footer with website theme styling
  const finalY = (doc as any).lastAutoTable.finalY || 60;
  doc.setFontSize(THEME_FONTS.size.small);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text(`Generated for: ${userName || 'User'}`, 20, finalY + 16);
  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
  doc.text(`Date: ${formattedDate}`, 20, finalY + 24);
  doc.save(`budgets-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportNotesToPDF = (notes, userName = 'User', filterInfo?: string) => {
  const doc = new jsPDF();
  
  // Header with website theme styling
  doc.setFontSize(THEME_FONTS.size.heading);
  doc.setTextColor(...THEME_COLORS.text);
  doc.setFont(THEME_FONTS.heading, 'bold');
  doc.text('Notes Report', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
  
  // Subtitle: SpendWiseGo - Expense Tracker
  doc.setFontSize(THEME_FONTS.size.caption + 1);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text('SpendWiseGo - Expense Tracker', doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });
  
  // Add filter information if provided
  if (filterInfo) {
    doc.setFontSize(THEME_FONTS.size.small);
    doc.setTextColor(...THEME_COLORS.textSecondary);
    doc.setFont(THEME_FONTS.body, 'normal');
    doc.text(`Filter: ${filterInfo}`, 20, 45);
  }
  
  // Table
  const tableColumn = [
    'Title',
    'Content'
  ];
  const sortedNotes = [...notes].sort((a, b) => {
    let dateA = a.createdAt;
    let dateB = b.createdAt;
    if (dateA && dateA.seconds) dateA = new Date(dateA.seconds * 1000);
    else if (dateA && dateA.toDate) dateA = dateA.toDate();
    else if (dateA && dateA instanceof Date) dateA = dateA;
    else dateA = new Date(dateA);
    if (dateB && dateB.seconds) dateB = new Date(dateB.seconds * 1000);
    else if (dateB && dateB.toDate) dateB = dateB.toDate();
    else if (dateB && dateB instanceof Date) dateB = dateB;
    else dateB = new Date(dateB);
    return dateB.getTime() - dateA.getTime();
  });
  const tableRows = sortedNotes.map(note => [
    note.title,
    (typeof window !== 'undefined' ? (new DOMParser().parseFromString(note.content, 'text/html').body.textContent || '') : note.content)
  ]);
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: filterInfo ? 55 : 40,
    theme: 'grid',
    headStyles: { 
      fillColor: [44, 62, 80], // #2c3e50
      textColor: 255, // white
      fontStyle: 'bold',
      fontSize: THEME_FONTS.size.body,
      font: THEME_FONTS.heading,
      halign: 'left'
    },
    bodyStyles: { 
      fillColor: THEME_COLORS.background, 
      textColor: THEME_COLORS.text[0],
      fontSize: THEME_FONTS.size.small,
      font: THEME_FONTS.body,
      valign: 'top' 
    },
    alternateRowStyles: { 
      fillColor: [248, 250, 252] // Gray-50
    },
    styles: { 
      font: THEME_FONTS.body, 
      fontSize: THEME_FONTS.size.small, 
      cellPadding: 4, 
      overflow: 'linebreak', 
      valign: 'top' 
    },
    margin: { left: 20, right: 20 },
    tableWidth: 'auto',
    columnStyles: {
      0: { minCellWidth: 60, cellWidth: 80, overflow: 'linebreak', valign: 'top' },
      1: { minCellWidth: 80, cellWidth: 'auto', overflow: 'linebreak', valign: 'top' }
    }
  });
  
  // Footer with website theme styling
  const finalY = (doc as any).lastAutoTable.finalY || 60;
  doc.setFontSize(THEME_FONTS.size.small);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text(`Generated for: ${userName || 'User'}`, 20, finalY + 16);
  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
  doc.text(`Date: ${formattedDate}`, 20, finalY + 24);
  doc.save(`notes-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportGoalsToPDF = (goals, userName = 'User', filterInfo?: string) => {
  const doc = new jsPDF();
  
  // Header with website theme styling
  doc.setFontSize(THEME_FONTS.size.heading);
  doc.setTextColor(...THEME_COLORS.text);
  doc.setFont(THEME_FONTS.heading, 'bold');
  doc.text('Goals Report', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
  
  // Subtitle: SpendWiseGo - Expense Tracker
  doc.setFontSize(THEME_FONTS.size.caption + 1);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text('SpendWiseGo - Expense Tracker', doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });
  
  // Add filter information if provided
  if (filterInfo) {
    doc.setFontSize(THEME_FONTS.size.small);
    doc.setTextColor(...THEME_COLORS.textSecondary);
    doc.setFont(THEME_FONTS.body, 'normal');
    doc.text(`Filter: ${filterInfo}`, 20, 45);
  }
  
  // Table
  const tableColumn = [
    'Goal Name',
    'Target Amount',
    'Saved Money',
    'Progress (%)',
    'Status',
    'Created Date'
  ];
  const sortedGoals = [...goals].sort((a, b) => {
    let dateA = a.createdAt;
    let dateB = b.createdAt;
    if (dateA && dateA.seconds) dateA = new Date(dateA.seconds * 1000);
    else if (dateA && dateA.toDate) dateA = dateA.toDate();
    else if (dateA && dateA instanceof Date) dateA = dateA;
    else dateA = dateA ? new Date(dateA) : new Date(0);
    if (dateB && dateB.seconds) dateB = new Date(dateB.seconds * 1000);
    else if (dateB && dateB.toDate) dateB = dateB.toDate();
    else if (dateB && dateB instanceof Date) dateB = dateB;
    else dateB = dateB ? new Date(dateB) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
  const tableRows = sortedGoals.map(g => [
    g.goalName,
    `BDT ${Number(g.goalAmount).toLocaleString()}`,
    `BDT ${Number(g.savedMoney || 0).toLocaleString()}`,
    g.goalAmount ? `${((g.progress || 0) * 100).toFixed(1)}%` : '0%',
    g.goalCompleted ? 'Completed' : 'In Progress',
    (() => {
      let d = g.createdAt;
      if (d && d.seconds) d = new Date(d.seconds * 1000);
      else if (d && d.toDate) d = d.toDate();
      else if (d && d instanceof Date) d = d;
      else d = d ? new Date(d) : '';
      return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}` : '';
    })()
  ]);
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: filterInfo ? 55 : 40,
    theme: 'grid',
    headStyles: { 
      fillColor: [44, 62, 80], // #2c3e50
      textColor: 255, // white
      fontStyle: 'bold',
      fontSize: THEME_FONTS.size.body,
      font: THEME_FONTS.heading,
      halign: 'left'
    },
    bodyStyles: { 
      fillColor: THEME_COLORS.background, 
      textColor: THEME_COLORS.text[0],
      fontSize: THEME_FONTS.size.small,
      font: THEME_FONTS.body
    },
    alternateRowStyles: { 
      fillColor: [248, 250, 252] // Gray-50
    },
    styles: { 
      font: THEME_FONTS.body, 
      fontSize: THEME_FONTS.size.small, 
      cellPadding: 4 
    },
    margin: { left: 20, right: 20 },
  });
  
  // Footer with website theme styling
  const finalY = (doc as any).lastAutoTable.finalY || 60;
  doc.setFontSize(THEME_FONTS.size.small);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text(`Generated for: ${userName || 'User'}`, 20, finalY + 16);
  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
  doc.text(`Date: ${formattedDate}`, 20, finalY + 24);
  doc.save(`goals-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportGoalsAndSavingsToPDF = (goals, savings, userName = 'User', filterInfo?: string) => {
  const doc = new jsPDF();
  let title = 'Goals & Savings Report';
  let finalY = 30;

  if (!goals.length && savings.length) {
    title = 'Savings Report';
  } else if (!savings.length && goals.length) {
    title = 'Goals Report';
  }

  // Header with website theme styling
  doc.setFontSize(THEME_FONTS.size.heading);
  doc.setTextColor(...THEME_COLORS.text);
  doc.setFont(THEME_FONTS.heading, 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
  finalY = 25;

  // Subtitle: SpendWiseGo - Expense Tracker
  doc.setFontSize(THEME_FONTS.size.caption + 1);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text('SpendWiseGo - Expense Tracker', doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });
  finalY = 32;

  // Add filter information if provided
  if (filterInfo) {
    doc.setFontSize(THEME_FONTS.size.small);
    doc.setTextColor(...THEME_COLORS.textSecondary);
    doc.setFont(THEME_FONTS.body, 'normal');
    doc.text(`Filter: ${filterInfo}`, 20, 45);
    finalY = 45;
  }

  // Only render Goals section if there are goals
  if (goals.length) {
    doc.setFontSize(THEME_FONTS.size.subheading);
    doc.setTextColor(...THEME_COLORS.text);
    doc.setFont(THEME_FONTS.heading, 'bold');
    const goalsStartY = filterInfo ? finalY + 10 : 40;
    doc.text('Goals', 20, goalsStartY);
    const goalTableColumn = [
      'Goal Name',
      'Target Amount',
      'Saved Money',
      'Progress (%)',
      'Status',
      'Created Date'
    ];
    const sortedGoals = [...goals].sort((a, b) => {
      let dateA = a.createdAt;
      let dateB = b.createdAt;
      if (dateA && dateA.seconds) dateA = new Date(dateA.seconds * 1000);
      else if (dateA && dateA.toDate) dateA = dateA.toDate();
      else if (dateA && dateA instanceof Date) dateA = dateA;
      else dateA = dateA ? new Date(dateA) : new Date(0);
      if (dateB && dateB.seconds) dateB = new Date(dateB.seconds * 1000);
      else if (dateB && dateB.toDate) dateB = dateB.toDate();
      else if (dateB && dateB instanceof Date) dateB = dateB;
      else dateB = dateB ? new Date(dateB) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    const goalTableRows = sortedGoals.map(g => [
      g.goalName,
      `BDT ${Number(g.goalAmount).toLocaleString()}`,
      `BDT ${Number(g.savedMoney || 0).toLocaleString()}`,
      g.goalAmount ? `${((g.progress || 0) * 100).toFixed(1)}%` : '0%',
      g.goalCompleted ? 'Completed' : 'In Progress',
      (() => {
        let d = g.createdAt;
        if (d && d.seconds) d = new Date(d.seconds * 1000);
        else if (d && d.toDate) d = d.toDate();
        else if (d && d instanceof Date) d = d;
        else d = d ? new Date(d) : '';
        return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}` : '';
      })()
    ]);
    autoTable(doc, {
      head: [goalTableColumn],
      body: goalTableRows,
      startY: goalsStartY + 5,
      theme: 'grid',
      headStyles: { 
        fillColor: [44, 62, 80], // #2c3e50
        textColor: 255, // white
        fontStyle: 'bold',
        fontSize: THEME_FONTS.size.body,
        font: THEME_FONTS.heading,
        halign: 'left'
      },
      bodyStyles: { 
        fillColor: THEME_COLORS.background, 
        textColor: THEME_COLORS.text[0],
        fontSize: THEME_FONTS.size.small,
        font: THEME_FONTS.body
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] // Gray-50
      },
      styles: { 
        font: THEME_FONTS.body, 
        fontSize: THEME_FONTS.size.small, 
        cellPadding: 4 
      },
      margin: { left: 20, right: 20 },
    });
    finalY = (doc as any).lastAutoTable?.finalY || 60;
  }

  // Only render Savings section if there are savings
  if (savings.length) {
    doc.setFontSize(THEME_FONTS.size.subheading);
    doc.setTextColor(...THEME_COLORS.text);
    doc.setFont(THEME_FONTS.heading, 'bold');
    const savingsStartY = goals.length ? finalY + 16 : (filterInfo ? finalY + 10 : 40);
    doc.text('Savings', 20, savingsStartY);
    const savingsTableColumn = [
      'Saving Name',
      'Target Amount',
      'Saved Money',
      'Progress (%)',
      'Status',
      'Created Date'
    ];
    const savingsTableRows = savings.map(s => [
      s.savingsName,
      `BDT ${Number(s.savingsAmount).toLocaleString()}`,
      `BDT ${Number(s.savedMoney || 0).toLocaleString()}`,
      s.savingsAmount ? `${((s.progress || 0) * 100).toFixed(1)}%` : '0%',
      s.savingsCompleted ? 'Completed' : 'In Progress',
      (() => {
        let d = s.createdAt;
        if (d && d.seconds) d = new Date(d.seconds * 1000);
        else if (d && d.toDate) d = d.toDate();
        else if (d && d instanceof Date) d = d;
        else d = d ? new Date(d) : '';
        return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}` : '';
      })()
    ]);
    autoTable(doc, {
      head: [savingsTableColumn],
      body: savingsTableRows,
      startY: savingsStartY + 5,
      theme: 'grid',
      headStyles: { 
        fillColor: [44, 62, 80], // #2c3e50
        textColor: 255, // white
        fontStyle: 'bold',
        fontSize: THEME_FONTS.size.body,
        font: THEME_FONTS.heading,
        halign: 'left'
      },
      bodyStyles: { 
        fillColor: THEME_COLORS.background, 
        textColor: THEME_COLORS.text[0],
        fontSize: THEME_FONTS.size.small,
        font: THEME_FONTS.body
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] // Gray-50
      },
      styles: { 
        font: THEME_FONTS.body, 
        fontSize: THEME_FONTS.size.small, 
        cellPadding: 4 
      },
      margin: { left: 20, right: 20 },
    });
    finalY = (doc as any).lastAutoTable?.finalY || (finalY + 40);
  }

  // Footer with website theme styling
  doc.setFontSize(THEME_FONTS.size.small);
  doc.setTextColor(...THEME_COLORS.textSecondary);
  doc.setFont(THEME_FONTS.body, 'normal');
  doc.text(`Generated for: ${userName || 'User'}`, 20, finalY + 16);
  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
  doc.text(`Date: ${formattedDate}`, 20, finalY + 24);
  let fileName = 'goals-savings-';
  if (!goals.length && savings.length) fileName = 'savings-';
  else if (!savings.length && goals.length) fileName = 'goals-';
  doc.save(`${fileName}${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportAllUserData = async (userId: string) => {
  const collections = ['budgets', 'transactions', 'notes', 'goals', 'savings'];
  const data: Record<string, any[]> = {};
  for (const col of collections) {
    const q = query(collection(db, col), where('userId', '==', userId));
    const snap = await getDocs(q);
    data[col] = snap.docs.map(doc => {
      const d = doc.data();
      // Convert Firestore Timestamps to ISO strings for portability
      Object.keys(d).forEach(key => {
        if (d[key]?.toDate) d[key] = d[key].toDate().toISOString();
      });
      return d;
    });
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spendwisego-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importAllUserData = async (userId: string, file: File, toast?: (msg: any) => void) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const collections = ['budgets', 'transactions', 'notes', 'goals', 'savings'];
    for (const col of collections) {
      if (!Array.isArray(data[col])) continue;
      for (const item of data[col]) {
        const newItem = { ...item, userId };
        delete newItem.id;
        // Convert ISO date strings back to Firestore Timestamps where needed
        Object.keys(newItem).forEach(key => {
          if (typeof newItem[key] === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(newItem[key])) {
            try {
              newItem[key] = Timestamp.fromDate(new Date(newItem[key]));
            } catch {}
          }
        });
        await addDoc(collection(db, col), newItem);
      }
    }
    if (toast) toast({ title: 'Success', description: 'Data imported successfully!' });
  } catch (error) {
    if (toast) toast({ title: 'Error', description: 'Failed to import data.', variant: 'destructive' });
    throw error;
  }
};
