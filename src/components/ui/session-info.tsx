"use client";

interface SessionInfoItem {
  label: string;
  value: string;
}

interface SessionInfoProps {
  items: SessionInfoItem[];
}

export function SessionInfo({ items }: SessionInfoProps) {
  return (
    <div className="my-5 flex flex-col gap-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between text-[13px]">
          <span className="text-[#667085]">{item.label}</span>
          <span className="font-medium text-[#344054]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
