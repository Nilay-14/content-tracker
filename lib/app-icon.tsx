import { ImageResponse } from "next/og";
import { THEME_COLOR } from "@/lib/theme";

/**
 * Draws the app icon (a white calendar with a tick on the theme colour)
 * as a PNG. `glyphScale` is how much of the square the glyph fills; maskable
 * icons need a smaller glyph so Android's crop doesn't cut it off.
 */
export function renderAppIcon(size: number, glyphScale = 0.62) {
  const glyph = Math.round(size * glyphScale);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEME_COLOR,
        }}
      >
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
