import React from "react";
import Layout from "@/components/Layout";
import {
  Sizes,
  Responsive,
  Variants,
  ResponsiveVariants,
  Color,
  Modifiers,
  Polymorphic,
  Truncate,
  Clamp,
  Align,
  Font
} from "@/components/ui/text-demo";

const TextDemo: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Text Component Demo
            </h1>
            <p className="text-muted-foreground text-lg">
              A comprehensive typography component with responsive design and multiple variants
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Sizes />
            <Responsive />
            <Variants />
            <ResponsiveVariants />
            <Color />
            <Modifiers />
            <Polymorphic />
            <Truncate />
            <Clamp />
            <Align />
            <Font />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TextDemo; 