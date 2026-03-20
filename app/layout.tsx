import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet";
import Header from "@/components/Header";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PROVEN — La verdad se demuestra.",
  description: "1v1 prediction challenges. AI settles it automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <WalletProvider>
          <Header />
          <main className="max-w-[640px] mx-auto px-5 py-8">{children}</main>
          <Toaster
            position="bottom-center"
            theme="dark"
            toastOptions={{
              style: {
                background: "#18181B",
                border: "1px solid #27272A",
                color: "#FAFAFA",
                borderRadius: 16,
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}
