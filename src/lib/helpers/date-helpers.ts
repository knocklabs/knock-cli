import { format, parseISO } from "date-fns";

export function formatDate(input: string): string {
  return format(parseISO(input), "MMM d, yyyy");
}
