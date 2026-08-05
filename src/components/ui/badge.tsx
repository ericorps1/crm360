import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-4 items-center rounded-full px-2 text-2xs font-semibold leading-none transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand text-white",
        secondary: "border bg-secondary text-text-2",
        outline: "text-foreground",
        success: "border-success-line bg-success-surface text-success-ink",
        warning: "border-warning-line bg-warning-surface text-warning-ink",
        destructive: "border-danger-line bg-danger-surface text-danger-ink",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
