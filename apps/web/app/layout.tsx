import type { Metadata } from 'next';
import './globals.css';
import { RoleProvider } from '@/context/RoleContext';

export const metadata: Metadata = {
  title: 'Advfiction HMS',
  description:
    'Advfiction Hospital Management System — Role-Based Clinical Portal with AI Voice Receptionist',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9FAFB] font-sans antialiased text-[#1F2937]">
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
