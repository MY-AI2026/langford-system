import { cn } from "@/lib/utils";

/**
 * Global application footer — sits at the very bottom of every surface
 * (dashboard, registration portal, login). Renders the engineering credit
 * with a subtle branded accent so it stays understated but always present.
 */
export function AppFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "mt-auto border-t border-border/60 py-4",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-foreground">
            ENG.Ahmad Alsayed
          </span>
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          © {year} Langford International Institute · Kuwait
        </p>
      </div>
    </footer>
  );
}
