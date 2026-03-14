"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

export function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();

  // Don't show on landing or onboarding pages
  if (
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname.includes("/auth/callback")
  ) {
    return null;
  }

  const tabs = [
    {
      name: "Home",
      href: "/dashboard",
      icon: "✨",
      activeIcon: "🔥",
    },
    {
      name: "Halaqa",
      href: "/halaqa",
      icon: "👥",
      activeIcon: "🤝",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: "⚙️",
      activeIcon: "⚙️",
    },
  ];

  return (
    <>
      {/* Spacer to prevent content from hiding behind nav */}
      <div className="h-20 w-full shrink-0" />
      
      {/* Mobile-first bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 glass border-t sm:hidden"
        style={{
          borderColor: "var(--surface-border)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)", // for iOS safe area
        }}
      >
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="flex flex-col items-center justify-center w-full h-full relative"
              >
                {isActive && (
                  <div
                    className="absolute top-0 w-8 h-1 rounded-b-full transition-all duration-300"
                    style={{ background: "var(--primary)" }}
                  />
                )}
                <span
                  className="text-2xl mb-1 transition-transform duration-200"
                  style={{
                    transform: isActive ? "scale(1.1) translateY(-2px)" : "scale(1)",
                    opacity: isActive ? 1 : 0.6,
                  }}
                >
                  {isActive ? tab.activeIcon : tab.icon}
                </span>
                <span
                  className="text-[10px] font-medium transition-colors duration-200"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--foreground-muted)",
                  }}
                >
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop/Tablet top navigation (hidden on mobile) */}
      <nav
        className="hidden sm:flex fixed top-0 left-0 right-0 z-50 glass border-b items-center justify-center p-4"
        style={{ borderColor: "var(--surface-border)" }}
      >
        <div className="flex items-center gap-8 max-w-2xl w-full justify-center">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200"
                style={{
                  background: isActive
                    ? theme === "dark"
                      ? "rgba(13, 148, 136, 0.15)"
                      : "rgba(13, 148, 136, 0.1)"
                    : "transparent",
                }}
              >
                <span className="text-xl">
                  {isActive ? tab.activeIcon : tab.icon}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--foreground-muted)",
                  }}
                >
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
