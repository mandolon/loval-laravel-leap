/**
 * TeamHomeHeroCard Component
 * Reusable hero card with gradient background for team dashboard
 */

import React from 'react';

interface TeamHomeHeroCardProps {
  userName: string;
  tabs?: React.ReactNode;
  helperText?: React.ReactNode;
  children?: React.ReactNode;
}

export function TeamHomeHeroCard({ userName, tabs, helperText, children }: TeamHomeHeroCardProps) {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = today.toLocaleDateString(undefined, { 
    month: "long", 
    day: "numeric" 
  });

  // Extract first name only
  const firstName = userName.split(' ')[0];

  return (
    <div className="relative rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-[#ffe4e7] via-[#fdf2ff] to-[#e5f2ff] px-8 pt-6 pb-8 overflow-hidden">
      <div className="pointer-events-none absolute -left-10 -top-24 h-64 w-64 rounded-full bg-[#ff9fb5]/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-10 h-72 w-72 rounded-full bg-[#60a5fa]/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-[-3rem] h-80 w-80 rounded-full bg-[#f97373]/30 blur-3xl" />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-[28px] leading-tight font-semibold text-slate-900 mb-1 pl-2">
            Welcome back, {firstName}!
          </h1>
          <p className="pl-2 text-lg text-slate-600 mb-8">
            Today is{" "}
            <span className="text-lg font-semibold text-slate-800">
              {dayOfWeek}, {monthDay}
            </span>
            {" — here's everything waiting on your desk."}
          </p>
          {tabs && (
            <div className="mt-12">
              {tabs}
            </div>
          )}
          {children && (
            <div className="mt-7">
              {children}
            </div>
          )}
        </div>
        {/* Helper text - vertically centered with entire card content */}
        {helperText && (
          <div className="hidden lg:flex lg:items-center">
            {helperText}
          </div>
        )}
      </div>
    </div>
  );
}
