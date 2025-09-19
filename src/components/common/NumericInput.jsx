// /src/components/common/NumericInput.jsx
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

export default function NumericInput({ value, onChange, allowDecimal = true, ...rest }) {
  const [txt, setTxt] = useState(value ?? "");

  useEffect(() => {
    // Sin imponer 0: si el valor es null/undefined mostramos vacío
    setTxt(value === 0 ? "0" : value ?? "");
  }, [value]);

  const re = allowDecimal ? /^[0-9]*([.][0-9]{0,4})?$/ : /^[0-9]*$/;

  return (
    <Input
      inputMode={allowDecimal ? "decimal" : "numeric"}
      placeholder="0"
      value={txt}
      onChange={(e) => {
        const v = e.target.value.replace(",", "."); // por si teclado numérico
        if (v === "") {
          setTxt("");
          onChange?.(null);
          return;
        }
        if (!re.test(v)) return;
        // evita 0s a la izquierda: "01" => "1"
        const normalized = v.startsWith("0") && v !== "0" && !v.startsWith("0.") ? String(parseInt(v, 10)) : v;
        setTxt(normalized);
        onChange?.(allowDecimal ? parseFloat(normalized) : parseInt(normalized || "0", 10));
      }}
      {...rest}
    />
  );
}
