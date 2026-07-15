import { useState } from "react";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/** Chip-list tag input — same shape as the product-context tags field on ScenarioDetailedScreen. */
export default function TagInput({ tags, onChange }: Props) {
  const [tagInput, setTagInput] = useState("");

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-slate-800 border border-slate-600 text-slate-300 text-xs px-2.5 py-1 rounded-full"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, j) => j !== i))}
              className="text-slate-500 hover:text-red-400 ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
            e.preventDefault();
            onChange([...tags, tagInput.trim()]);
            setTagInput("");
          }
        }}
        placeholder="Escribí y presioná Enter para agregar..."
        className="field-input"
      />
    </div>
  );
}
