"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home", isActive: (p) => p === "/" },
  {
    href: "/activity",
    label: "Activity",
    isActive: (p) => p === "/activity" || p.startsWith("/activity/") || p.startsWith("/activity-detail"),
  },
  {
    href: "/companies",
    label: "Companies",
    isActive: (p) => p === "/companies" || p.startsWith("/companies/") || p.startsWith("/company"),
  },
];

type HighlightRect = { left: number; top: number; width: number; height: number } | null;

export default function SidebarNav(): React.ReactElement {
  const pathname = usePathname() || "/";
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [highlightRect, setHighlightRect] = useState<HighlightRect>(null);

  const activeIndex = useMemo(
    () => navItems.findIndex((n) => n.isActive(pathname)),
    [pathname]
  );

  useEffect(() => {
    function updateRect(): void {
      const navEl = navRef.current;
      const activeItem = navItems[activeIndex];
      if (!navEl || !activeItem) {
        setHighlightRect(null);
        return;
      }
      const activeLink = linkRefs.current[activeItem.href];
      if (!activeLink) {
        setHighlightRect(null);
        return;
      }
      const navBox = navEl.getBoundingClientRect();
      const linkBox = activeLink.getBoundingClientRect();
      const left = linkBox.left - navBox.left;
      const top = linkBox.top - navBox.top;
      setHighlightRect({ left, top, width: linkBox.width, height: linkBox.height });
    }

    updateRect();
    const ro = new ResizeObserver(() => updateRect());
    if (navRef.current) ro.observe(navRef.current);
    window.addEventListener("resize", updateRect);
    const id = window.setTimeout(updateRect, 0);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.clearTimeout(id);
      ro.disconnect();
    };
  }, [activeIndex]);

  return (
    <nav ref={navRef} className="relative grid gap-0.5 text-sm" aria-label="Primary">
      <div
        aria-hidden
        className={`glass-pill-active glass-pill-highlight rounded-full ${
          highlightRect ? "opacity-100" : "opacity-0"
        }`}
        style={
          highlightRect
            ? {
                transform: `translate3d(${highlightRect.left}px, ${highlightRect.top}px, 0)`,
                width: `${highlightRect.width}px`,
                height: `${highlightRect.height}px`,
              }
            : undefined
        }
      />
      {navItems.map((item, index) => {
        const active = index === activeIndex;
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              linkRefs.current[item.href] = el;
            }}
            className={`relative z-[1] flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              active ? "text-[#0045F7]" : "text-[#4B5563] hover:text-[#0045F7]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}


