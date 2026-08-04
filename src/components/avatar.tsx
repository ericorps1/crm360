import { cn, initials } from "@/lib/utils";

/** Avatar de contacto: iniciales sobre un neutro del sistema. */
export function ContactAvatar({
  name,
  size = "md",
}: {
  name: string;
  /** Se conserva por compatibilidad de llamadas; ya no define color. */
  seed?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  } as const;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes[size]
      )}
      // Neutro a propósito: gris en claro, negro en oscuro. Los avatares no
      // compiten con la marca ni con los badges de estatus.
      style={{
        background: "var(--avatar-bg)",
        color: "var(--avatar-fg)",
        boxShadow: "inset 0 0 0 1px var(--avatar-ring)",
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
