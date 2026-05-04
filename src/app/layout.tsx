import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Ising model simulator",
  description: "A simple Ising model simulator",
  icons: {
    icon: [
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
      { url: `${basePath}/favicon.ico`, type: "image/x-icon", sizes: "any" },
    ],
    shortcut: `${basePath}/favicon.ico`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get Google Analytics ID from environment variables
  const gaId = process.env.NEXT_PUBLIC_GA_ID || "";

  return (
    <html lang="en">
      <head>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        <link rel="modulepreload" href={`${basePath}/wasm/ising_core.js`} />
        <link
          rel="preload"
          href={`${basePath}/wasm/ising_core_bg.wasm`}
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-roboto antialiased">{children}</body>
    </html>
  );
}
