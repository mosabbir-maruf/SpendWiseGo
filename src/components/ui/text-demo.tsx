import React from "react";
import { Text, TTextVariant } from "@/components/ui/text";

export const Sizes = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Sizes</div>
    <Text size={48}>The Evil Rabbit jumps.</Text>
    <Text size={32}>The Evil Rabbit jumps.</Text>
    <Text size={24}>The Evil Rabbit jumps.</Text>
    <Text size={20}>The Evil Rabbit jumps.</Text>
    <Text size={16}>The Evil Rabbit jumps.</Text>
    <Text size={14}>The Evil Rabbit jumps.</Text>
    <Text size={12}>The Evil Rabbit jumps.</Text>
    <Text size={10}>The Evil Rabbit jumps.</Text>
  </div>
);

export const Responsive = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Responsive</div>
    <Text size={{ sm: 24, md: 32, lg: 48 }}>The Evil Rabbit jumps.</Text>
  </div>
);

export const Variants = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Variants</div>
    {[
      "heading-72",
      "heading-64",
      "heading-56",
      "heading-48",
      "heading-40",
      "heading-32",
      "heading-24",
      "heading-20",
      "heading-16",
      "button-16",
      "button-14",
      "button-12",
      "label-20",
      "label-18",
      "label-16",
      "label-14",
      "label-13",
      "label-12",
      "copy-24",
      "copy-20",
      "copy-18",
      "copy-16",
      "copy-14",
      "copy-13"
    ].map((variant) => (
      <Text
        key={variant}
        transform="capitalize"
        variant={variant as TTextVariant}
      >
        {variant.replace("-", " ")}
      </Text>
    ))}
  </div>
);

export const ResponsiveVariants = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Responsive variants</div>
    <Text variant={{ sm: "heading-24", md: "heading-32", lg: "heading-48" }}>
      Responsive Heading
    </Text>
    <Text variant={{ sm: "copy-14", md: "copy-16", lg: "copy-20" }}>
      Responsive Copy, Lorem ipsum dolor sit amet, consectetur adipiscing
      elit.
    </Text>
  </div>
);

export const Color = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Color</div>
    <Text color="blue-900" size={16}>
      The Evil Rabbit jumps.
    </Text>
  </div>
);

export const Modifiers = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Modifiers</div>
    <Text size={16}>
      The <strong>Evil Rabbit</strong> <em>jumps</em>
      over the <s>quick brown fox</s> <u>Lawful Meerkat</u>.
    </Text>
  </div>
);

export const Polymorphic = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Polymorphic</div>
    <Text size={32}>
      {`<p>`} semantically, {`<h2>`} visually.
    </Text>
  </div>
);

export const Truncate = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Truncate</div>
    <div className="max-w-[100px]">
      <Text size={16} truncate>
        The Evil Rabbit jumps.
      </Text>
    </div>
  </div>
);

export const Clamp = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Clamp</div>
    <div className="max-h-[100px] max-w-[100px]">
      <Text size={16} truncate={2}>
        The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps. The
        Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps. The
        Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps. The
        Evil Rabbit jumps. The Evil Rabbit jumps.
      </Text>
    </div>
  </div>
);

export const Align = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Align</div>
    <div>
      <Text align="center">The Evil Rabbit jumps.</Text>
      <Text align="left">The Evil Rabbit jumps.</Text>
      <Text align="right">The Evil Rabbit jumps.</Text>
    </div>
  </div>
);

export const Font = () => (
  <div className="flex flex-col gap-2">
    <div className="font-bold text-xl dark:text-white">Font Family</div>
    <div>
      <Text>This is a sans-serif font.</Text>
      <Text monospace>This is a monospace font.</Text>
    </div>
  </div>
); 