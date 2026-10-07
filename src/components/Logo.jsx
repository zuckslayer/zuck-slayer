import { Link } from "react-router-dom";

export function LogoMark({ size = "md" }) {
  const dims = {
    sm: { box: "w-8 h-8", svg: "w-4 h-4", radius: "rounded-lg" },
    md: { box: "w-10 h-10", svg: "w-5 h-5", radius: "rounded-xl" },
    lg: { box: "w-14 h-14", svg: "w-7 h-7", radius: "rounded-2xl" },
  };
  const d = dims[size] || dims.md;

  return (
    <div
      className={`${d.box} ${d.radius} bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center shadow-[0_0_25px_-6px_rgba(236,72,153,0.7)]`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${d.svg} text-white`}
      >
        {/* Z */}
        <path d="M6 8 H18 L6 16 H18" />

        {/* ⚔️ Sword — vertical, handle up top */}

        {/* Handle / grip — top of the tile */}
        <path d="M12 1 L12 5" strokeWidth="2.2" />

        {/* Guard — horizontal crosspiece */}
        <path d="M7.5 5 L16.5 5" strokeWidth="2.4" />

        {/* Blade — full vertical, extends past the Z's bottom */}
        <path d="M12 5 L12 23" strokeWidth="2.4" />
      </svg>
    </div>
  );
}

export function LogoFull({ to = "/", size = "md", showVersion = true }) {
  const textSize =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <Link to={to} className="flex items-center gap-3 w-fit group">
      <div className="transition-transform group-hover:scale-105">
        <LogoMark size={size} />
      </div>
      <div>
        <h1 className={`${textSize} font-black text-white tracking-tighter leading-none`}>
          ZUCK
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            {" "}
            SLAYER
          </span>
        </h1>
        {showVersion && (
          <p className="text-[9px] text-gray-500 font-mono tracking-widest mt-1.5">
            EST. 2025 · v0.1.0 BETA
          </p>
        )}
      </div>
    </Link>
  );
}