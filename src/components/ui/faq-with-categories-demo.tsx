import { FaqSectionWithCategories } from "@/components/ui/faq-with-categories";
import { useNavigate } from "react-router-dom";
import React from "react";

const PROJECT_FAQS = [
  {
    question: "What is SpendWiseGo?",
    answer: "SpendWiseGo is a modern personal finance management app that helps you track expenses, set budgets, and achieve your savings goals with ease.",
    category: "General",
  },
  {
    question: "How do I add a new transaction?",
    answer: "Go to the Transactions page and click the 'Add Transaction' button. Fill in the details and save your transaction.",
    category: "Transactions",
  },
  {
    question: "Can I set and track budgets?",
    answer: "Yes! Navigate to the Budgets page to create, edit, and monitor your budgets for different categories.",
    category: "Budgets",
  },
  {
    question: "How do I change my account settings?",
    answer: "Click on the Settings page from the sidebar or footer to update your profile, change your password, and manage preferences.",
    category: "Account",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. Your data is securely stored using Firebase and is only accessible to you.",
    category: "Security",
  },
  {
    question: "How can I contact support?",
    answer: "You can reach out via the Contact page or use the Contact Support button below.",
    category: "Support",
  },
];

export function FaqSectionWithCategoriesDemo() {
  const navigate = useNavigate();
  return (
    <FaqSectionWithCategories
      title="Frequently Asked Questions"
      description="Find answers to common questions about SpendWiseGo."
      items={PROJECT_FAQS}
      contactInfo={{
        title: "Still have questions?",
        buttonText: "Contact Support",
        onContact: () => navigate("/contact"),
      }}
    />
  );
} 