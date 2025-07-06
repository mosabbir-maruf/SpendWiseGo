import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { 
  TrendingUp, 
  PieChart, 
  Target, 
  DollarSign, 
  BarChart3, 
  Shield 
} from 'lucide-react';

const features = [
  {
    icon: TrendingUp,
    title: "Expense Tracking",
    description: "Track every expense with detailed categories and smart insights."
  },
  {
    icon: PieChart,
    title: "Budget Management",
    description: "Set budgets and monitor spending with visual charts and alerts."
  },
  {
    icon: Target,
    title: "Goal Setting",
    description: "Set financial goals and track your progress towards achieving them."
  },
  {
    icon: DollarSign,
    title: "Income Tracking",
    description: "Monitor your income sources and understand your cash flow."
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Get detailed insights into your spending patterns and trends."
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your financial data is encrypted and secure with enterprise-grade protection."
  }
];

const Index: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 animate-fade-in">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in">
              <Text variant="heading-48" className="mb-6 leading-tight sm:leading-tight">
                Take Control of Your
                <span className="text-primary block">Finances</span>
              </Text>
              <Text variant="copy-20" color="gray-1000" className="mb-8 max-w-2xl mx-auto">
                SpendWiseGo helps you track expenses, manage budgets, and achieve your financial goals with beautiful, intuitive tools.
              </Text>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-10 xs:py-12 sm:py-16 px-2 xs:px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 xs:mb-10 sm:mb-12">
              <Text variant="heading-32" className="mb-3 xs:mb-4">
                Everything you need to manage your money
              </Text>
              <Text variant="copy-18" color="gray-1000">
                Powerful features designed to make financial tracking effortless
              </Text>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-4 xs:p-6 flex flex-col items-center text-center">
                    <feature.icon className="w-10 h-10 xs:w-12 xs:h-12 text-primary mb-3 xs:mb-4" />
                    <Text variant="heading-20" className="mb-1 xs:mb-2">
                      {feature.title}
                    </Text>
                    <Text variant="copy-16" color="gray-1000">
                      {feature.description}
                    </Text>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 xs:py-12 sm:py-16 px-2 xs:px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 xs:p-8 sm:p-12">
                <Text variant="heading-32" className="mb-3 xs:mb-4">
                  Ready to start your financial journey?
                </Text>
                <Text variant="copy-18" color="gray-1000" className="mb-6 xs:mb-8">
                  Join thousands of users who are already managing their finances smarter
                </Text>
                <Link to="/register">
                  <Button size="lg">
                    Start Tracking Today
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
