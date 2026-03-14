import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Dynamic params
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
            background: "linear-gradient(to bottom right, #0F172A, #020617)",
            fontFamily: "sans-serif",
            padding: "40px",
          }}
        >
          {/* Decorative background circle */}
          <div
            style={{
              position: "absolute",
              top: "-200px",
              left: "-100px",
              width: "600px",
              height: "600px",
              background: "radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-200px",
              right: "-100px",
              width: "600px",
              height: "600px",
              background: "radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 70%)",
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
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(13, 148, 136, 0.3)",
              borderRadius: "32px",
              padding: "60px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontSize: 80,
                marginBottom: 20,
              }}
            >
              🔥
            </div>
            
            <div
              style={{
                fontSize: 40,
                color: "#e2e8f0",
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
                  color: "#2dd4bf", /* teal-400 */
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
                  color: "#cbd5e1",
                }}
              >
                Day Streak
              </span>
            </div>

            <div
              style={{
                fontSize: 24,
                color: "#94a3b8",
                marginTop: 30,
                fontStyle: "italic",
                textAlign: "center",
                maxWidth: "800px",
              }}
            >
              "The most beloved of deeds to Allah are those that are most consistent, even if it is small."
            </div>
          </div>

          {/* Watermark */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              display: "flex",
              alignItems: "center",
              color: "#64748b",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            Built with Legacy 🌙
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
