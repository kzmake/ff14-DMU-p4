import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "絶妖星乱舞P4 カンペ",
  description: "FF14 絶妖星乱舞 P4 真偽判定カンペ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // ノッチ/ホームバー領域まで使い、env(safe-area-inset-*) を有効化（iPad/iPhone）
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
