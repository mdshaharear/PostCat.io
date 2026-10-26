import { ImageResponse } from "next/og";

export const alt = "PostCat — Find better products, faster";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", color: "#12211b", background: "radial-gradient(circle at 82% 18%, #d7ef72 0, #d7ef72 16%, transparent 17%), linear-gradient(135deg, #f6f4ed 0%, #e9f2e5 100%)", fontFamily: "Arial, sans-serif" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "44px", fontWeight: 800 }}><span style={{ display: "flex", width: "64px", height: "64px", borderRadius: "18px", alignItems: "center", justifyContent: "center", background: "#a83d2a", color: "#fffdf7" }}>P</span>PostCat</div>
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px" }}><div style={{ fontSize: "84px", lineHeight: 0.95, letterSpacing: "-4px", fontWeight: 750 }}>Find better products, faster.</div><div style={{ fontSize: "30px", color: "#456056" }}>Clear categories. Useful comparisons. Transparent merchant offers.</div></div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", fontWeight: 700 }}><span>postcat.io</span><span>Product discovery without the noise</span></div>
  </div>, size);
}
