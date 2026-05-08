export default function ExpiredPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 1000px 500px at top, rgba(59,130,246,0.06), transparent 60%), #0a0d12",
      }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center"
        style={{ background: "#141a24", border: "1px solid #252b38" }}
      >
        <div
          className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: "rgba(125,133,144,0.1)", border: "1px solid #252b38" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#9ca3af" }}>
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M10 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold mb-2" style={{ color: "#e4e6ea" }}>
          Your session has ended
        </h1>
        <p className="text-sm" style={{ color: "#9ca3af" }}>
          For your security, we sign you out automatically. Ask your advisor to send a fresh
          access link any time.
        </p>
      </div>
    </div>
  );
}
