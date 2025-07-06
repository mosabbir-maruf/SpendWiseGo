import React from "react";
import { FaqSectionWithCategoriesDemo } from "@/components/ui/faq-with-categories-demo";
import Layout from "@/components/Layout";
import { Text } from "@/components/ui/text";

const Faq: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="-mt-8">
          <FaqSectionWithCategoriesDemo />
        </div>
      </div>
    </Layout>
  );
};

export default Faq; 