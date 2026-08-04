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
  // Tamaños desde los tokens de densidad: el lg de 48px era lo que hacía que
  // la fila de conversación midiera ~92px.
  const sizes = {
    sm: "h-[var(--avatar-sm)] w-[var(--avatar-sm)] text-2xs",
    md: "h-[var(--avatar-md)] w-[var(--avatar-md)] text-2xs",
    lg: "h-[var(--avatar-lg)] w-[var(--avatar-lg)] text-xs",
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
