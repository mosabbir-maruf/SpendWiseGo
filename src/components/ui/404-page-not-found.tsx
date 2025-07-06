"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export const Component = () => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <svg
        className="w-64 h-64 mb-8 text-primary"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <ellipse cx="200" cy="260" rx="120" ry="20" fill="currentColor" opacity="0.1" />
        <path d="M120 200 Q140 120 200 120 Q260 120 280 200" stroke="currentColor" strokeWidth="6" fill="none" />
        <circle cx="160" cy="180" r="16" fill="currentColor" />
        <circle cx="240" cy="180" r="16" fill="currentColor" />
        <ellipse cx="200" cy="220" rx="40" ry="10" fill="currentColor" opacity="0.2" />
        <text x="200" y="110" textAnchor="middle" fontSize="64" fontWeight="bold" fill="currentColor" opacity="0.8">404</text>
      </svg>
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Page Not Found</h1>
      <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
        Sorry, the page you are looking for could not be found.
      </p>
      <Button asChild size="lg">
        <a href="/" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Return Home
        </a>
      </Button>
    </div>
  );
}; 