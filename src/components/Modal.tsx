import { X } from "@phosphor-icons/react";
import { useEffect, ReactNode } from "react";
import { cn } from "../utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/45 backdrop-blur-[6px] z-[200] flex items-center justify-center p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={cn(
          "bg-surface border border-card-border rounded-[20px] w-full max-w-[640px] max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)] animate-in slide-in-from-bottom-6 duration-250",
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-7 pt-6 flex items-start justify-between">
          <div className="font-serif text-[22px] text-text">{title}</div>
          <button 
            onClick={onClose}
            className="bg-transparent border-none text-text3 text-xl cursor-pointer p-1 transition-all rounded-md hover:bg-vermelho-soft hover:text-vermelho"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-7 pt-5">
          {children}
        </div>
      </div>
    </div>
  );
}
