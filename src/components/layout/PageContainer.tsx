import type { ReactNode } from "react";
import { Header } from "./Header";

interface PageContainerProps {
  title: string;
  children: ReactNode;
}

export function PageContainer({ title, children }: PageContainerProps) {
  return (
    <>
      <Header title={title} />
      <div className="flex-1 overflow-auto p-6 bg-tp-light">
        {children}
      </div>
    </>
  );
}
