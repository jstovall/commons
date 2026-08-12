"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/browse", label: "Borrow" },
  { href: "/asks", label: "Asks" },
  { href: "/my-items", label: "My items" },
  { href: "/profile", label: "Profile" },
];

export default function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...navItems, { href: "/admin/members", label: "Admin" }]
    : navItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 flex justify-around gap-2 border-t-2 border-commons-ink bg-commons-card px-2 py-2">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
  isActive
    ? "commons-button commons-button-salmon text-xs uppercase tracking-wide"
    : "commons-button commons-button-secondary text-xs uppercase tracking-wide"
}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}