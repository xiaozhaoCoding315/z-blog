import { ImageResponse } from "next/og";

/** 动态 favicon：观测台的深色面板 + 读数蓝的字母 Z（与站点 token 同源） */
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
          background: "#14171c",
          color: "#6f9bd1",
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
