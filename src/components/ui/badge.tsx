import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[3px] border px-1.5 py-px text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand text-white",
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
