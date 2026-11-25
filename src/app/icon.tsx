import { ImageResponse } from "next/og";

/** 动态 favicon：夜班桌面底 + 磷光字母 Z（与站点暗色 token 同源） */
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
          borderRadius: 8,
          background: "#0f0e0c",
          color: "#d9a05b",
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
