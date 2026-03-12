import { useEffect } from "react";
import { cn } from "../utils";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <div 
      className={cn(
        "fixed bottom-7 right-7 bg-surface border border-card-border border-l-4 border-l-azul-claro rounded-xl px-[18px] py-3.5 flex items-center gap-3 text-[13px] z-[500] shadow-[var(--shadow-lg)] max-w-[360px] text-text transition-all duration-350",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}
    >
      {message}
    </div>
  );
}
