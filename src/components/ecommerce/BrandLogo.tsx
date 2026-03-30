import { useEffect, useState } from "react";

interface BrandLogoProps {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  className?: string;
  imageClassName?: string;
}

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

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
        "relative overflow-hidden rounded-xl flex items-center justify-center",
        className,
      )}
    >
      {showImage ? (
        <img
          key={src}
          src={src || undefined}
          alt={alt}
          className={joinClasses("h-full w-full object-contain", imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-4 text-center">
          <span className="text-sm font-medium text-muted-foreground">{fallbackText || alt}</span>
        </div>
      )}
    </div>
  );
}
