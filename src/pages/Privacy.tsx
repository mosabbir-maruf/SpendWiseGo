import React from 'react';
import { FaqSectionWithCategories } from '@/components/ui/faq-with-categories';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Text } from '@/components/ui/text';

const PRIVACY_ITEMS = [
  {
    question: "What information do we collect?",
    answer: "We collect your account information (name, email, profile details), usage data to improve our services, financial data (budgets, transactions, notes, goals), and may use cookies to enhance your experience.",
    category: "Data Collection",
  },
  {
    question: "How do we use your information?",
    answer: "We use your information to provide and improve SpendWiseGo's features, personalize your experience, communicate with you about updates or support, and ensure security and prevent fraud.",
    category: "Data Usage",
  },
  {
    question: "Do we use third-party services?",
    answer: "Yes, we use trusted third-party services (like Firebase and Google) for authentication, data storage, and analytics. These services may collect information as described in their own privacy policies.",
    category: "Third-Party Services",
  },
  {
    question: "What are your rights?",
    answer: "You can access, update, or delete your account data at any time. You can also contact us to request data deletion or for any privacy concerns.",
    category: "Your Rights",
  },
  {
    question: "Do we update this policy?",
    answer: "We may update this policy from time to time. We'll notify you of any significant changes.",
    category: "Policy Updates",
  },
  {
    question: "How can you contact us about privacy?",
    answer: "If you have questions about this policy, email us at hellomosabbir@outlook.com.",
    category: "Contact",
  },
];

const Privacy: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="-mt-8">
          <FaqSectionWithCategories
            title="Privacy Policy"
            description="Read our privacy policy to understand how we handle your data."
            items={PRIVACY_ITEMS}
            contactInfo={{
              title: "Have privacy questions?",
              buttonText: "Contact Us",
              onContact: () => navigate("/contact"),
            }}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Privacy; 