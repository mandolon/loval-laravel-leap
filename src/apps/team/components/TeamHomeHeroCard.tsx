/**
 * TeamHomeHeroCard Component
 * Reusable hero card with gradient background for team dashboard
 */

interface TeamHomeHeroCardProps {
  userName: string;
  children?: React.ReactNode;
}

export function TeamHomeHeroCard({ userName, children }: TeamHomeHeroCardProps) {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = today.toLocaleDateString(undefined, { 
    month: "long", 
    day: "numeric" 
  });

  return (
    <div className="relative rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-[#ffe4e7] via-[#fdf2ff] to-[#e5f2ff] px-8 pt-9 pb-8 overflow-hidden">
      <div className="pointer-events-none absolute -left-10 -top-24 h-64 w-64 rounded-full bg-[#ff9fb5]/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-10 h-72 w-72 rounded-full bg-[#60a5fa]/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-[-3rem] h-80 w-80 rounded-full bg-[#f97373]/30 blur-3xl" />
      <div className="relative z-10">
        <h1 className="text-[28px] leading-tight font-semibold text-slate-900 mb-1 pl-2">
          Welcome back, {userName}!
        </h1>
        <p className="pl-2 text-[13px] text-slate-600 mb-4">
          Today is{" "}
          <span className="font-semibold text-slate-800">
            {dayOfWeek}, {monthDay}
          </span>
          {" — here's everything waiting on your desk."}
        </p>
        {children && (
          <div>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
