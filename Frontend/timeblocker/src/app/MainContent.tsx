'use client';

export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-16 w-full">
      {children}
    </main>
  );
}
