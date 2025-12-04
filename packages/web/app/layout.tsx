import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Malro Kiosk',
  description: '말로 주문하는 키오스크 MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-neutral-100 text-neutral-900">
        <header className="border-b bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <span className="text-xl font-semibold">malro kiosk</span>
            <nav className="flex gap-4 text-sm">
              <a className="hover:text-blue-600" href="/kiosk">
                키오스크
              </a>
              <a className="hover:text-blue-600" href="/admin">
                어드민
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
