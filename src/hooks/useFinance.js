import { useContext } from 'react';
import { FinanceContext } from '../contexts/context';
export const useFinance = () => useContext(FinanceContext);
