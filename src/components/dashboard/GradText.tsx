import type { ReactNode } from "react";
import { GRAD } from "../../lib/theme";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function GradText({ children, className = "" }: Props) {
  return (
    <span
      className={className}
      style={{
        background: GRAD,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}
