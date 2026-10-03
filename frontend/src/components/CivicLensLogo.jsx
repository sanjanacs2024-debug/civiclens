import { useState } from "react";
const LOGO_SRC = "/civiclens-logo.png";

export default function CivicLensLogo({
  src = LOGO_SRC,
  alt = "CivicLens",
  height = 34,
  maxWidth = 170,
  className = "",
  imageClassName = "",
  chip = false,
  fallback = null,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return fallback ? <span className={className}>{fallback}</span> : null;
  }

  return (
    <span className={className}>
      <img
        src={src}
        alt={alt}
        onError={() => setImageFailed(true)}
        style={{ height: `${height}px`, maxWidth: `${maxWidth}px` }}
        className={["w-auto object-contain", chip ? "rounded-lg bg-white p-1" : "", imageClassName].join(" ")}
      />
    </span>
  );
}
