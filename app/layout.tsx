import type { Metadata } from "next";
import "./globals.css";
import { fontDisplay, fontBody, fontMono } from "@/lib/fonts";
import { WalletProvider } from "@/lib/wallet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PROVEN — La verdad se demuestra.",
  description:
    "1v1 prediction challenges settled by AI. No referees. No arguments. PROVEN decides.",
  openGraph: {
    title: "PROVEN — La verdad se demuestra.",
    description: "1v1 prediction challenges settled by AI automatically.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body>
        <WalletProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-pv-cyan focus:text-pv-bg focus:rounded-lg focus:font-bold"
          >
            Saltar al contenido
          </a>
          <Header />
          <main
            id="main-content"
            className="max-w-[640px] mx-auto px-5 py-8"
          >
            {children}
          </main>
          <Footer />
          <Toaster
            position="bottom-center"
            theme="dark"
            toastOptions={{
              style: {
                background: "#18181B",
                border: "1px solid #27272A",
                color: "#FAFAFA",
                borderRadius: 16,
                fontFamily: "var(--font-body)",
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}
