import React, { createContext, useContext, useEffect, useState } from 'react';

type Currency = 'INR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  symbol: string;
  setCurrency: (currency: Currency) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>('INR');
  const [isLoading, setIsLoading] = useState(true);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('preferred_currency', newCurrency);
  };

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const savedCurrency = localStorage.getItem('preferred_currency');
        if (savedCurrency === 'INR' || savedCurrency === 'USD') {
          setCurrencyState(savedCurrency);
          setIsLoading(false);
          return;
        }

        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const _rawJson7 = await response.json();
            const data = _rawJson7 && _rawJson7.success !== undefined ? (_rawJson7.success ? _rawJson7.data : _rawJson7) : _rawJson7;
          const detectedCurrency = data.country_code === 'IN' ? 'INR' : 'USD';
          setCurrencyState(detectedCurrency);
          localStorage.setItem('preferred_currency', detectedCurrency);
        }
      } catch (error) {
        console.error('Failed to detect currency:', error);
        // Fallback is INR
      } finally {
        setIsLoading(false);
      }
    };

    detectCurrency();
  }, []);

  const symbol = currency === 'INR' ? '₹' : '$';

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
