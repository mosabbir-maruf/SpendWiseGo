import React from 'react';
import { FaqSectionWithCategories } from '@/components/ui/faq-with-categories';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Text } from '@/components/ui/text';

const TERMS_ITEMS = [
  {
    question: "What are the terms of service?",
    answer: "By accessing or using SpendWiseGo, you agree to be bound by these Terms of Service and our Privacy Policy. Please read them carefully.",
    category: "Acceptance",
  },
  {
    question: "What are my responsibilities as a user?",
    answer: "You must provide accurate information when creating your account, keep your login credentials secure and confidential, and use SpendWiseGo in compliance with all applicable laws.",
    category: "User Responsibilities",
  },
  {
    question: "What activities are prohibited?",
    answer: "You may not use SpendWiseGo for any unlawful or harmful purpose, attempt to access accounts or data of other users, or interfere with the operation or security of the app.",
    category: "Prohibited Activities",
  },
  {
    question: "What about intellectual property?",
    answer: "All content, trademarks, and code in SpendWiseGo are the property of their respective owners. You may not copy, modify, or distribute any part of the app without permission.",
    category: "Intellectual Property",
  },
  {
    question: "What are the disclaimers?",
    answer: "SpendWiseGo is provided \"as is\" without warranties of any kind. We are not responsible for any loss or damages resulting from your use of the app.",
    category: "Disclaimers",
  },
  {
    question: "Can the terms change?",
    answer: "We may update these terms from time to time. Continued use of SpendWiseGo means you accept the new terms.",
    category: "Changes to Terms",
  },
  {
    question: "How can I contact you about terms?",
    answer: "If you have questions about these terms, email us at hellomosabbir@outlook.com.",
    category: "Contact",
  },
];

const Terms: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="-mt-8">
          <FaqSectionWithCategories
            title="Terms of Service"
            description="Read our terms of service to understand your rights and responsibilities."
            items={TERMS_ITEMS}
            contactInfo={{
              title: "Have questions about terms?",
              buttonText: "Contact Us",
              onContact: () => navigate("/contact"),
            }}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Terms; 