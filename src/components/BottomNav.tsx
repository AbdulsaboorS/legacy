"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ filled }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.293 2.293a1 1 0 0 1 1.414 0l8 8A1 1 0 0 1 21 11h-1v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-5H10v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9H3a1 1 0 0 1-.707-1.707l9-9z" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

function HalaqaIcon({ filled }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="7" r="3.5" />
        <circle cx="15" cy="7" r="3.5" />
        <path d="M2 20c0-3.866 3.134-7 7-7h6c3.866 0 7 3.134 7 7H2z" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="7" r="3.5" />
      <circle cx="15" cy="7" r="3.5" />
      <path d="M2 20c0-3.866 3.134-7 7-7h6c3.866 0 7 3.134 7 7" />
    </svg>
  );
}

function SettingsIcon({ filled }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.6 7.6 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5z" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  // Don't show on landing, onboarding, or auth pages
  if (
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname.includes("/auth/callback")
  ) {
    return null;
  }

  const tabs = [
    { name: "Home", href: "/dashboard" },
    { name: "Halaqa", href: "/halaqa" },
    { name: "Settings", href: "/settings" },
  ];

  return (
    <>
      {/* Spacer to prevent content from hiding behind mobile nav */}
      <div className="h-20 w-full shrink-0 sm:hidden" />

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 glass border-t sm:hidden"
        style={{
          borderColor: "var(--surface-border)",
          paddingBottom: "env(safe-area-inset-bottom, 12px)",
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
                {/* Pill indicator behind icon */}
                {isActive && (
                  <div
                    className="absolute inset-x-3 top-1.5 bottom-1.5 rounded-2xl transition-all duration-300"
                    style={{
                      background: "var(--primary)",
                      opacity: 0.1,
                    }}
                  />
                )}

                <div
                  className="relative z-10 mb-0.5 transition-all duration-200"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--foreground-muted)",
                    opacity: isActive ? 1 : 0.55,
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  {tab.name === "Home" && <HomeIcon filled={isActive} />}
                  {tab.name === "Halaqa" && <HalaqaIcon filled={isActive} />}
                  {tab.name === "Settings" && <SettingsIcon filled={isActive} />}
                </div>

                <span
                  className="text-[10px] font-medium transition-colors duration-200 relative z-10"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--foreground-muted)",
                    opacity: isActive ? 1 : 0.6,
                  }}
                >
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop/Tablet top navigation */}
      <nav
        className="hidden sm:flex fixed top-0 left-0 right-0 z-50 glass border-b items-center justify-center p-4"
        style={{ borderColor: "var(--surface-border)" }}
      >
        <div className="flex items-center gap-6 max-w-2xl w-full justify-center">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200"
                style={{
                  background: isActive
                    ? "rgba(27, 94, 69, 0.12)"
                    : "transparent",
                }}
              >
                <span
                  style={{
                    color: isActive ? "var(--primary)" : "var(--foreground-muted)",
                    opacity: isActive ? 1 : 0.65,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {tab.name === "Home" && <HomeIcon filled={isActive} />}
                  {tab.name === "Halaqa" && <HalaqaIcon filled={isActive} />}
                  {tab.name === "Settings" && <SettingsIcon filled={isActive} />}
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
