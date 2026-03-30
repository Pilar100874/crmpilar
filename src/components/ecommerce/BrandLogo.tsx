import { useEffect, useState } from "react";

interface BrandLogoProps {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  className?: string;
  imageClassName?: string;
}

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const patternStyle = {
  backgroundColor: "hsl(var(--background))",
  backgroundImage: [
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%)",
    "linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%)",
    "linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%)",
    "linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  ].join(", "),
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  backgroundSize: "20px 20px",
} as const;

export default function BrandLogo({
  src,
  alt,
  fallbackText,
  className,
  imageClassName,
}: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const showImage = Boolean(src) && !hasError;

  return (
    <div
      className={joinClasses(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div aria-hidden="true" className="absolute inset-0 opacity-70" style={patternStyle} />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-background/90 via-card/80 to-muted/80" />

      {showImage ? (
        <img
          key={src}
          src={src || undefined}
          alt={alt}
          className={joinClasses("relative z-10 h-full w-full object-contain p-3", imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="relative z-10 flex h-full w-full items-center justify-center p-4 text-center">
          <span className="text-sm font-medium text-muted-foreground">{fallbackText || alt}</span>
        </div>
      )}
    </div>
  );
}