"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const navItems = [
  { href: "/browse", label: "Borrow" },
  { href: "/asks", label: "Asks" },
  { href: "/my-items", label: "My Items" },
  { href: "/profile", label: "Profile" },
];

function navigateWithTransition(
  router: ReturnType<typeof useRouter>,
  href: string,
  direction: "forward" | "back"
) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (doc.startViewTransition) {
    document.documentElement.dataset.transitionDirection = direction;
    doc.startViewTransition(() => {
      router.push(href);
    }).finished.finally(() => {
      delete document.documentElement.dataset.transitionDirection;
    });
  } else {
    router.push(href);
  }
}

export default function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const items = isAdmin
    ? [...navItems, { href: "/admin/members", label: "Admin" }]
    : navItems;

  const activeIndex = items.findIndex((item) => pathname.startsWith(item.href));

  useEffect(() => {
    const activeItem = items[activeIndex];
    if (!activeItem) return;
    itemRefs.current[activeItem.href]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function handleClick(e: React.MouseEvent, href: string, index: number) {
    e.preventDefault();
    if (href === pathname) return;
    navigateWithTransition(router, href, index > activeIndex ? "forward" : "back");
  }

  function scrollByAmount(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 border-t-2 border-commons-ink bg-commons-card"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByAmount(-140)}
          aria-label="Scroll nav left"
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 px-1 font-mono text-lg text-commons-ink/40"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => scrollByAmount(140)}
          aria-label="Scroll nav right"
          className="absolute right-1 top-1/2 z-10 -translate-y-1/2 px-1 font-mono text-lg text-commons-ink/40"
        >
          ›
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto px-8 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          <div className="shrink-0" style={{ width: "30vw" }} aria-hidden="true" />
          {items.map((item, index) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleClick(e, item.href, index)}
                ref={(el) => {
                  itemRefs.current[item.href] = el;
                }}
                style={{ scrollSnapAlign: "center" }}
                className={
                  isActive
                    ? "commons-button commons-button-salmon shrink-0 whitespace-nowrap text-xs uppercase tracking-wide"
                    : "commons-button commons-button-secondary shrink-0 whitespace-nowrap text-xs uppercase tracking-wide"
                }
              >
                {item.label}
              </Link>
            );
          })}
          <div className="shrink-0" style={{ width: "30vw" }} aria-hidden="true" />
        </div>
      </div>

      <div className="flex justify-center gap-1.5 pb-1.5">
        {items.map((item, i) => (
          <span
            key={item.href}
            className={`h-1.5 w-1.5 rounded-full ${
              i === activeIndex ? "bg-commons-ink" : "bg-commons-ink/25"
            }`}
          />
        ))}
      </div>
    </nav>
  );
}