import { useEffect, useState } from "react";
import splashImg from "@/assets/splash.png";

const SPLASH_KEY = "pilar-splash-shown";

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const fadeTimer = setTimeout(() => setFadeOut(true), 2200);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SPLASH_KEY, "1");
    }, 2800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[2147483646] flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at top left, #4c1d95 0%, #1e1b4b 45%, #0f172a 100%)",
      }}
      onClick={() => {
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
          sessionStorage.setItem(SPLASH_KEY, "1");
        }, 300);
      }}
    >
      <img
        src={splashImg}
        alt="Pilar - Conecte. Integre. Encante."
        className="max-h-[92vh] max-w-[92vw] object-contain animate-in fade-in zoom-in-95 duration-700 drop-shadow-2xl"
      />
    </div>
  );
}
