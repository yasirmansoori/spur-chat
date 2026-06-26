/**
 * @file page.tsx
 * @description Main entry page (Home) for the Spur Customer Hub app.
 * Renders page-level layout, grids, landing placeholders, and mounts the SupportChatWidget.
 */

'use client';

import dynamic from 'next/dynamic';

const SupportChatWidget = dynamic(
  () => import('@/components/chat/SupportChatWidget'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#f3f4f6] text-zinc-800 flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Monochromatic Grid Pattern */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Page Layout Placeholder */}
      <div className="max-w-xl text-center z-10 space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 font-display">
          Spur Customer Hub
        </h1>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
          Log in to track orders, manage settings, or chat with our help center for quick support.
        </p>
      </div>

      {/* Floating modular Support Chat Widget */}
      <SupportChatWidget />
    </main>
  );
}


