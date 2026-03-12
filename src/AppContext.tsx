import { createContext, useContext, useState, ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';

interface AppContextType {
  showToast: (message: string) => void;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: (modalId: string) => void;
  isModalOpen: (modalId: string) => boolean;
  getModalData: <T = unknown>(modalId: string) => T | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [openModals, setOpenModals] = useState<Record<string, boolean>>({});
  const [modalData, setModalData] = useState<Record<string, unknown>>({});

  const showToast = (message: string) => {
    sonnerToast.success(message);
  };

  const openModal = (modalId: string, data?: unknown) => {
    if (data !== undefined) setModalData(prev => ({ ...prev, [modalId]: data }));
    setOpenModals(prev => ({ ...prev, [modalId]: true }));
  };

  const closeModal = (modalId: string) => {
    setOpenModals(prev => ({ ...prev, [modalId]: false }));
    setModalData(prev => { const next = { ...prev }; delete next[modalId]; return next; });
  };

  const isModalOpen = (modalId: string) => {
    return !!openModals[modalId];
  };

  const getModalData = <T = unknown,>(modalId: string): T | null => {
    return (modalData[modalId] as T) ?? null;
  };

  return (
    <AppContext.Provider value={{ showToast, openModal, closeModal, isModalOpen, getModalData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
