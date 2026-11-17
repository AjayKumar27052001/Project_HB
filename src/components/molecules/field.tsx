import type { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, className = "", ...inputProps }: FieldProps) {
  const inputId = id ?? label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} className={className} {...inputProps} />
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
