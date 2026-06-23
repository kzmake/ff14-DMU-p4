"use client";

import { useState } from "react";

// Document Picture-in-Picture API（Chrome系のみ。型定義が無いので最小限で宣言）
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
      window: Window | null;
    };
  }
}

// 最前面の小窓(Document PiP)を開閉し、描画先 container を返すフック。
// container が non-null の間、呼び出し側は createPortal でそこへ描画する。
export function useDocumentPip(opts?: { width?: number; height?: number; fontFactor?: number }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const toggle = async () => {
    const dpip = window.documentPictureInPicture;
    if (!dpip) {
      alert("この機能はDocument Picture-in-Picture対応ブラウザ（Chrome系）でのみ使えます。");
      return;
    }
    if (dpip.window) {
      dpip.window.close();
      return;
    }
    const width = opts?.width ?? 480;
    const height = opts?.height ?? 160;
    const fontFactor = opts?.fontFactor ?? 0.16;
    const pip = await dpip.requestWindow({ width, height });

    // 親ページのスタイル（Tailwind等）を小窓へコピー
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const css = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join("");
        const style = pip.document.createElement("style");
        style.textContent = css;
        pip.document.head.appendChild(style);
      } catch {
        if (sheet.href) {
          const link = pip.document.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          pip.document.head.appendChild(link);
        }
      }
    }

    // 小窓は dvh が極小になり文字が潰れるので、root font-size を高さ基準のpx固定に。
    const applyPipFont = () => {
      const h = pip.innerHeight || height;
      const px = Math.max(14, Math.round(h * fontFactor));
      pip.document.documentElement.style.fontSize = `${px}px`;
    };
    applyPipFont();
    pip.addEventListener("resize", applyPipFont);
    pip.document.body.style.margin = "0";
    pip.document.body.style.background = "#0f0f0f";
    pip.document.body.style.padding = "6px";
    const el = pip.document.createElement("div");
    el.style.width = "100%";
    el.style.height = "100%";
    pip.document.body.appendChild(el);
    pip.addEventListener("pagehide", () => setContainer(null));
    setContainer(el);
  };

  return { container, toggle, open: container !== null };
}
