import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const name = searchParams.get("name") || "A friend";
    const streak = searchParams.get("streak") || "0";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, #141210 0%, #1A2820 50%, #1E1A10 100%)",
            fontFamily: "sans-serif",
            padding: "40px",
          }}
        >
          {/* Green radial glow top */}
          <div
            style={{
              position: "absolute",
              top: "-150px",
              left: "-100px",
              width: "600px",
              height: "600px",
              background:
                "radial-gradient(circle, rgba(76, 175, 130, 0.15) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />
          {/* Gold radial glow bottom */}
          <div
            style={{
              position: "absolute",
              bottom: "-150px",
              right: "-100px",
              width: "600px",
              height: "600px",
              background:
                "radial-gradient(circle, rgba(201, 150, 58, 0.15) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />

          {/* Main Card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(20, 18, 16, 0.6)",
              border: "1px solid rgba(76, 175, 130, 0.25)",
              borderRadius: "32px",
              padding: "60px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 80, marginBottom: 20 }}>🔥</div>

            <div
              style={{
                fontSize: 40,
                color: "#F1F0EE",
                marginBottom: 10,
                fontWeight: 600,
              }}
            >
              {name}&apos;s Post-Ramadan Legacy
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                margin: "20px 0",
              }}
            >
              <span
                style={{
                  fontSize: 120,
                  fontWeight: 900,
                  color: "#C9963A",
                  lineHeight: 1,
                  marginRight: "20px",
                }}
              >
                {streak}
              </span>
              <span
                style={{
                  fontSize: 50,
                  fontWeight: 700,
                  color: "#9CA3AF",
                }}
              >
                Day Streak
              </span>
            </div>

            <div
              style={{
                fontSize: 24,
                color: "#9CA3AF",
                marginTop: 30,
                fontStyle: "italic",
                textAlign: "center",
                maxWidth: "800px",
              }}
            >
              &quot;The most beloved of deeds to Allah are those that are most consistent,
              even if it is small.&quot;
            </div>

            {/* Gold divider */}
            <div
              style={{
                width: "120px",
                height: "3px",
                background: "linear-gradient(135deg, #C9963A, #E8B85A)",
                borderRadius: "9999px",
                marginTop: "30px",
              }}
            />
          </div>

          {/* Watermark */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              display: "flex",
              alignItems: "center",
              color: "#6B7280",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            Join me on Legacy 🌙
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response(`Failed to generate the image`, { status: 500 });
  }
}
