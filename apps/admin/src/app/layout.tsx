import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Class 10 · Admin',
  description: 'Administration console for the Class 10 Learning Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}