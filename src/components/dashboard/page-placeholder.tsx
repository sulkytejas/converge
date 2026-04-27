export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[#667085]">{description}</p>
        )}
      </div>
      <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-white p-12 text-center">
        <p className="text-sm text-[#667085]">
          {title} page — coming soon.
        </p>
      </div>
    </>
  );
}
