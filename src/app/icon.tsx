import { ImageResponse } from "next/og";

/** 动态 favicon：渐变 Z 品牌图标（与站点 logo 同源） */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          background: "linear-gradient(135deg, #7c5cff, #38bdf8)",
          color: "#fff",
          fontSize: 44,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        Z
      </div>
    ),
    { ...size }
  );
}
