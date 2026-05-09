import Image from "next/image";

interface UniLogoProps {
  name: string;
  logoUrl?: string | null;
  /** Pixel size — also drives the rounded-corner radius proportionally. */
  size?: number;
}

// A handful of fallback gradients picked to look distinct in a list. The hash
// of the university name picks one — same name → same colour every render.
const PALETTE = [
  "from-[#1570EF] to-[#0b4ea2]",
  "from-[#475467] to-[#1D2939]",
  "from-[#7F56D9] to-[#53389E]",
  "from-[#067647] to-[#054F31]",
  "from-[#B54708] to-[#7A2E0E]",
  "from-[#0E9384] to-[#0A6E61]",
  "from-[#C11574] to-[#8A0E5A]",
];

function paletteFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length] ?? PALETTE[0]!;
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Square-tile university logo. Renders the uploaded `logoUrl` if provided,
 * otherwise a coloured initial block. Used in the partner search results,
 * admin universities table, and any future student-facing UI.
 */
export function UniLogo({ name, logoUrl, size = 48 }: UniLogoProps) {
  const radius = Math.max(6, Math.round(size * 0.25));
  if (logoUrl) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden bg-white"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br font-bold text-white ${paletteFor(name)}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.round(size * 0.32),
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
