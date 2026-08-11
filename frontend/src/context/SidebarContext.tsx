import React, { createContext, useContext } from "react";

interface SidebarState {
  isCollapsed: boolean;
}

const SidebarContext = createContext<SidebarState>({ isCollapsed: false });

export const SidebarProvider: React.FC<{ isCollapsed: boolean; children: React.ReactNode }> = ({ isCollapsed, children }) => (
  <SidebarContext.Provider value={{ isCollapsed }}>
    {children}
  </SidebarContext.Provider>
);

// Ancho real del sidebar (Sidebar.tsx: w-20 colapsado, w-64 expandido) según el estado
// compartido — evita medir el DOM (ResizeObserver) y su desfase frente a la transición
// CSS del propio sidebar, para que ambos se muevan exactamente al mismo tiempo.
export const useSidebarWidth = (): number => {
  const { isCollapsed } = useContext(SidebarContext);
  return isCollapsed ? 80 : 256;
};
