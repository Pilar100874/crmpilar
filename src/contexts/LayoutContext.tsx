import { createContext, useContext } from "react";

interface LayoutContextType {
  openSubmenu: (submenuId: string) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return context;
}

export { LayoutContext };
