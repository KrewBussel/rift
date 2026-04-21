export default function ExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1117" }}>
      <div className="max-w-md w-full rounded-xl p-8 text-center" style={{ background: "#161b22", border: "1px solid #21262d" }}>
        <h1 className="text-lg font-semibold mb-2" style={{ color: "#e4e6ea" }}>Your session has ended</h1>
        <p className="text-sm" style={{ color: "#9ca3af" }}>
          Ask your advisor to send you a new access link.
        </p>
      </div>
    </div>
  );
}
