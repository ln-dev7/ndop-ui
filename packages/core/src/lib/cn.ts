import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * A class value accepted by {@link cn}: a string, an array, a
 * `{ class: condition }` dictionary, or a falsy value to skip.
 */
export type { ClassValue };

/**
 * Joins class values and resolves Tailwind conflicts so later classes win.
 * Styled items call it as `cn(variantClasses, this.class())`, which is what
 * lets a user's `class` override a variant's utilities.
 *
 * @param inputs - Class values, in increasing priority.
 * @returns A single class string with conflicting utilities removed.
 *
 * @example
 * ```ts
 * cn('px-4 bg-primary', isActive && 'bg-accent', 'px-2'); // 'bg-accent px-2' when active
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
