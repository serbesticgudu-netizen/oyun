import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Tiyatro Theia',
  description: 'Tiyatro Theia Cyber-Pagan Platformu',
  // --- PWA / Apple Ayarları ---
  appleWebApp: {
    capable: true,
    title: 'Tiyatro Theia',
    statusBarStyle: 'black-translucent', // Üst barın (saat/pil kısmı) chat sayfan gibi şeffaf/siyah görünmesini sağlar
  },
  formatDetection: {
    telephone: false, // Telefon numaralarının otomatik linke dönüşüp stili bozmasını engeller
  },
  icons: {
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  // -----------------------------
}
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Bu satır zoom yapılmasını engeller
  userScalable: false, // Kullanıcının elle büyütmesini de kapatır (opsiyonel)
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
