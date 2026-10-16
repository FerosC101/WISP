"use client";

// Last-resort error page when the app shell itself fails. It replaces the root layout, so it styles itself.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-SG">
      <body style={{ margin: 0, minHeight: "100vh", background: "#faf7ee", color: "#24352f", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ color: "#2f4f3e", fontSize: 28, fontFamily: "Georgia, serif" }}>WISP couldn&apos;t load</h1>
          <p style={{ fontSize: 18, lineHeight: 1.5 }}>Please try again. If you feel very unwell, call 995.</p>
          <button onClick={retry} style={{ marginTop: 16, minHeight: 52, width: "100%", border: 0, borderRadius: 18, background: "#2f4f3e", color: "#fff", fontSize: 18, fontWeight: 600 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
