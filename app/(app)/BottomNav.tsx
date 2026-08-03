"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/browse", label: "Borrow" },
  { href: "/asks", label: "Asks" },
  { href: "/my-items", label: "My items" },
  { href: "/profile", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 flex justify-around gap-2 border-t-2 border-commons-ink bg-commons-card px-2 py-2">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "rounded-md bg-commons-salmon px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-commons-ink shadow-[2px_2px_0_#332B22]"
                : "rounded-md bg-commons-cream px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-commons-ink"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}