"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, CalendarDays, Utensils, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/feedings/new", label: "Log", icon: Utensils, primary: true },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur safe-bottom">
      <ul className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 pt-2">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  primary && "relative",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    primary && "bg-primary text-primary-foreground shadow",
                    primary && active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <Icon className={cn("h-5 w-5", primary && "h-5 w-5")} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
