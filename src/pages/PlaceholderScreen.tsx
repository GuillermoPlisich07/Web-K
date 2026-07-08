interface Props {
  title: string;
  description: string;
}

export default function PlaceholderScreen({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-24">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-3">{title}</h2>
      <p className="text-[#7F8899] text-sm max-w-sm">{description}</p>
      <span
        className="mt-6 text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full"
        style={{
          backgroundColor: "#151D2B",
          color: "#7F8899",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        Próximamente
      </span>
    </div>
  );
}
