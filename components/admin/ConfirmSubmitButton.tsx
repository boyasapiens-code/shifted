"use client";

import { buttonClass } from "@/components/ui";

/**
 * Submit button for a destructive form action (delete). The only client-side
 * bit in the /admin/content forms — everything else is a plain server-action
 * form, same as the rest of the admin surface.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  children,
}: {
  confirmMessage: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={buttonClass("ghost", "sm", "text-danger hover:bg-danger/10")}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
