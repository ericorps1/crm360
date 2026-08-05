import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // gap-1.5 y el dimensionado automático de íconos evitan tener que poner
  // "h-4 w-4" a mano en cada llamada, que es lo que se hacía antes.
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-semibold transition-[background-color,color,box-shadow,opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[15px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-brand-hover active:scale-[.98]",
        secondary:
          "bg-brand-soft text-brand-text hover:brightness-95 active:scale-[.98]",
        outline:
          "estado border border-border-strong bg-transparent active:scale-[.98]",
        ghost: "estado",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 active:scale-[.98]",
      },
      size: {
        default: "h-[var(--control-h)] px-3",
        sm: "h-[var(--control-h-sm)] px-2 text-xs",
        lg: "h-8 px-5",
        icon: "h-[var(--control-h)] w-[var(--control-h)]",
        "icon-sm": "h-[var(--control-h-sm)] w-[var(--control-h-sm)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
