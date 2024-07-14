"use client";

import { QueryProvider } from "@/components/query-provider";

interface ProvidersProps {
  children: React.ReactNode;
};

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <QueryProvider>
      {children}
    </QueryProvider>
  );
};
