import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import Image from "next/image";
import Providers from "./providers";
import SidebarNav from "./SidebarNav";
const avenir = localFont({
  src: [
    { path: "../../public/fonts/Avenir/Light/Avenir Light.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/Avenir/Regular/Avenir Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/Avenir/Book/Avenir Book.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/Avenir/Heavy/Avenir Heavy.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/Avenir/Black/Avenir Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-avenir",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Edison by 640 Oxford",
  description: "Partner dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${avenir.variable} antialiased bg-[#F8FAFC] text-[#111827]`}>
        <Providers>
          <div className="grid min-h-screen grid-cols-[260px_1fr]">
            <aside className="bg-white border-r border-[#E5E7EB] p-5 grid grid-rows-[auto_auto_1fr] gap-3">
              <div className="flex items-center gap-2 font-black tracking-tight text-[#111827]">
                <Image src="/logo.jpeg" alt="640 Oxford OS logo" width={32} height={32} className="h-8 w-8 object-cover" priority />
                <div>640 Oxford OS</div>
              </div>
              <SidebarNav />
              <div className="text-xs text-[#4B5563] self-end mt-auto">Private. Partners only.</div>
            </aside>
            <div className="min-w-0">
              <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between backdrop-saturate-125 backdrop-blur-sm">
                <div className="text-sm text-[#6B7280]" aria-label="Breadcrumbs">&nbsp;</div>
                {/* <div className="ml-auto flex items-center gap-2 text-[#4B5563]"><span>partner@firm.com</span><div className="h-7 w-7 rounded-full bg-[#cbd5e1]" aria-hidden="true" /></div> */}
              </header>
              <main className="p-5 grid gap-5">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
