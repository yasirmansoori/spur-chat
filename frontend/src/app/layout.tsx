import type { Metadata } from 'next';
import { Outfit, Inter, Geist } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Spurly Live Chat | AI Support Agent',
  description: 'Instant customer support powered by advanced conversational AI.',
  icons: {
    icon: '/spur-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", outfit.variable, inter.variable, "font-sans", geist.variable)}>
      <body className="h-full bg-zinc-100 text-zinc-900 flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
