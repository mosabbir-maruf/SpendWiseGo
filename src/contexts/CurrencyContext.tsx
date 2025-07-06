
import React, { createContext, useContext, useEffect, useState } from 'react';

interface Currency {
  value: string;
  label: string;
  symbol: string;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  currencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currencies = [
    { value: 'BDT', label: '৳ BDT (Bangladeshi Taka)', symbol: '৳' },
    { value: 'USD', label: '$ USD (US Dollar)', symbol: '$' },
    { value: 'EUR', label: '€ EUR (Euro)', symbol: '€' },
    { value: 'INR', label: '₹ INR (Indian Rupee)', symbol: '₹' },
    { value: 'GBP', label: '£ GBP (British Pound)', symbol: '£' },
  ];

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('currency');
    if (saved) {
      try {
        const savedCurrency = JSON.parse(saved);
        return currencies.find(c => c.value === savedCurrency.value) || currencies[0];
      } catch {
        return currencies[0];
      }
    }
    return currencies[0]; // Default to BDT
  });

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', JSON.stringify(newCurrency));
  };

  const value = {
    currency,
    setCurrency,
    currencies
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
