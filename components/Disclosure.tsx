"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "./ui";

/**
 * WAI-ARIA "Disclosure" pattern: a button that shows/hides a panel next to
 * it. This is the one piece of real client JS in the nav — everything else
 * in this app is server-rendered forms, but a genuinely accessible menu
 * trigger (real aria-expanded that reflects live state, Escape-to-close,
 * click-outside-to-close, focus returned to the trigger on close) isn't
 * achievable with the codebase's existing <details>/<summary> idiom, which
 * has none of those.
 *
 * Deliberately NOT role="menu"/role="menuitem" — this doesn't implement the
 * full ARIA menu keyboard pattern (arrow keys, Home/End, type-ahead), and
 * claiming that role without the behavior is worse than a plain disclosure:
 * assistive tech announces "menu" and the arrow keys silently don't work.
 * Plain Tab order through the panel's real links/buttons once it's open is
 * correct and sufficient here.
 *
 * Panel content is `children` (a plain ReactNode, not a render-prop) so
 * Server Components (ViewToggle, LanguageSwitcher — real <form> actions)
 * can be passed straight through from a Server Component parent, per
 * Next.js's server-into-client-as-children pattern.
 *
 * The panel is ALWAYS mounted — closing toggles CSS visibility (`hidden`),
 * never conditional rendering. A filter-sheet variant of this component
 * holds real <select>/<input> form fields; unmounting them on close would
 * silently drop whatever the user picked (a real bug caught while building
 * the mobile filter sheet — "preserve selections when the panel closes" is
 * impossible if the fields don't exist while closed). `hidden` elements are
 * also correctly removed from the tab order and a11y tree on their own, so
 * this costs nothing accessibility-wise.
 *
 * `closeOnInnerClick` (default true) closes the panel on any click inside —
 * correct for a menu of single-click nav links/form-submit buttons
 * (AccountMenu, MobileMenu). Set it false for a panel with intermediate
 * controls the user interacts with before an explicit Apply/Clear/close
 * (the filter sheet) — otherwise picking an option from a <select> would
 * close the whole sheet on the first click. In that mode, a click still
 * closes the panel if it lands on an element (or a descendant of one)
 * carrying `data-disclosure-close` — put that attribute on an explicit "×"
 * close button. A real Apply/Clear submit button doesn't need it: clicking
 * `type="submit"` triggers a real GET navigation, which remounts the page
 * (and this component) fresh — the panel is naturally closed on the
 * resulting page, no extra wiring required.
 *
 * `panelPosition`: "absolute" (default) anchors a small corner popover to
 * the trigger — right for a compact menu like AccountMenu. "fixed" is for
 * a full-width mobile panel (MobileMenu, the filter sheet): `absolute`
 * there would position relative to the trigger's own tiny wrapper div, not
 * the viewport, and silently run the panel off the right edge of the
 * screen (it did, until this existed) — `fixed` + `inset-x` anchors to the
 * viewport instead.
 */
export function Disclosure({
  triggerContent,
  triggerLabel,
  triggerClassName,
  panelClassName,
  align = "right",
  panelPosition = "absolute",
  closeOnInnerClick = true,
  children,
}: {
  triggerContent: React.ReactNode;
  triggerLabel: string;
  triggerClassName?: string;
  panelClassName?: string;
  align?: "left" | "right";
  panelPosition?: "absolute" | "fixed";
  closeOnInnerClick?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={triggerLabel}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          // 44x44 minimum touch target, regardless of the icon's own size.
          "flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2",
          triggerClassName,
        )}
      >
        {triggerContent}
      </button>
      <div
        id={panelId}
        hidden={!open}
        onClick={(e) => {
          if (closeOnInnerClick) {
            setOpen(false);
          } else if ((e.target as HTMLElement).closest("[data-disclosure-close]")) {
            setOpen(false);
          }
        }}
        className={cn(
          "z-50 rounded-[var(--radius-card)] border border-stone-200 bg-paper p-2 shadow-lg",
          panelPosition === "fixed"
            ? "fixed inset-x-3 top-[4.25rem] max-h-[calc(100dvh-5rem)] overflow-y-auto"
            : cn("absolute mt-2 min-w-56", align === "right" ? "right-0" : "left-0"),
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
