"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Root Tabs container
 */
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ value, onValueChange, className, children }: TabsProps) {
  // Only inject props into TabsList, not all children
  const injectedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    
    // Only inject props into TabsList components
    if (child.type === TabsList) {
      return React.cloneElement(child as React.ReactElement<any>, {
        activeValue: value,
        onValueChange,
      });
    }
    
    return child;
  });

  return <div className={cn("flex flex-col", className)}>{injectedChildren}</div>;
}

/**
 * TabsList - container for triggers
 */
interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}

export function TabsList({
  children,
  className,
  activeValue,
  onValueChange,
}: TabsListProps) {
  // Only inject props into TabsTrigger components
  const injectedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    
    if (child.type === TabsTrigger) {
      return React.cloneElement(child, {
        activeValue,
        onValueChange,
      });
    }
    
    return child;
  });

  return (
    <div className={cn("flex border-b border-gray-200", className)}>
      {injectedChildren}
    </div>
  );
}

/**
 * TabsTrigger - clickable tab button
 */
interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}

export function TabsTrigger({
  value,
  activeValue,
  onValueChange,
  children,
}: TabsTriggerProps) {
  const isActive = activeValue === value;

  const handleClick = () => {
    if (onValueChange) onValueChange(value);
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={cn(
        "px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
        isActive
          ? "text-blue-600 border-b-2 border-blue-600 bg-white"
          : "text-gray-600 hover:text-gray-800"
      )}
    >
      {children}
    </button>
  );
}

/**
 * TabsContent - shown only when active
 */
interface TabsContentProps {
  value: string;
  activeValue?: string;
  className?: string;
  children: React.ReactNode;
}

export function TabsContent({
  value,
  activeValue,
  className,
  children,
}: TabsContentProps) {
  if (value !== activeValue) return null;
  return <div className={cn("p-2", className)}>{children}</div>;
}