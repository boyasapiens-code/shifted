"use client";

import type { SelectHTMLAttributes } from "react";
import { Select } from "./ui";

/**
 * Submits its enclosing form on change — the one bit of client JS a sort
 * dropdown genuinely needs (nobody expects "pick a sort, then also click
 * Search"). Everything else in the jobs search stays a plain GET form.
 */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Select
      {...props}
      onChange={(e) => {
        e.currentTarget.form?.requestSubmit();
        props.onChange?.(e);
      }}
    />
  );
}
