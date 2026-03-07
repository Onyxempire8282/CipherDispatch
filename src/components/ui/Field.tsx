import "./field.css";

interface FieldProps {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export default function Field({
  label,
  optional = false,
  hint,
  error,
  children,
}: FieldProps) {
  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <div className="field__label">
        {label}
        {optional && <span className="field__label-optional"> (optional)</span>}
      </div>
      {children}
      {hint && !error && <div className="field__hint">{hint}</div>}
      {error && <div className="field__error">{error}</div>}
    </div>
  );
}
