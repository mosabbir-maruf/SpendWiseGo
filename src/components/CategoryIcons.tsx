import { Utensils, Car, Tv, ShoppingBag, Home, Lightbulb, Heart, HelpCircle, Book, DollarSign, PiggyBank, Receipt, Target } from 'lucide-react';
import * as React from 'react';

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  food: <Utensils className="w-5 h-5" />,
  transport: <Car className="w-5 h-5" />,
  entertainment: <Tv className="w-5 h-5" />,
  shopping: <ShoppingBag className="w-5 h-5" />,
  housing: <Home className="w-5 h-5" />,
  utilities: <Lightbulb className="w-5 h-5" />,
  health: <Heart className="w-5 h-5" />,
  education: <Book className="w-5 h-5" />,
  salary: <DollarSign className="w-5 h-5" />,
  investment: <PiggyBank className="w-5 h-5" />,
  bills: <Receipt className="w-5 h-5" />,
  other: <HelpCircle className="w-5 h-5" />,
  savings: <PiggyBank className="w-5 h-5" />,
  goal: <Target className="w-5 h-5" />,
}; 