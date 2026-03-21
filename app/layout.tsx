import "./globals.css";
import { fontDisplay, fontBody, fontMono } from "@/lib/fonts";
import { WalletProvider } from "@/lib/wallet";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body>
        <NextTopLoader
          color="#22D3EE"
          height={2}
          showSpinner={false}
          shadow={false}
        />
        <WalletProvider>
          {children}
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
