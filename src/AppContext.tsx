import { createContext, useContext, useState, ReactNode } from 'react';
import { Toast } from './components/Toast';

interface AppContextType {
  showToast: (message: string) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  isModalOpen: (modalId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState({ message: '', isVisible: false });
  const [openModals, setOpenModals] = useState<Record<string, boolean>>({});

  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const openModal = (modalId: string) => {
    setOpenModals(prev => ({ ...prev, [modalId]: true }));
  };

  const closeModal = (modalId: string) => {
    setOpenModals(prev => ({ ...prev, [modalId]: false }));
  };

  const isModalOpen = (modalId: string) => {
    return !!openModals[modalId];
  };

  return (
    <AppContext.Provider value={{ showToast, openModal, closeModal, isModalOpen }}>
      {children}
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={closeToast} />
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
