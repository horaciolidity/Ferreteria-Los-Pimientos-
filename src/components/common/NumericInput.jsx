// /src/components/common/NumericInput.jsx
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

export default function NumericInput({
  value,
  onChange,
  allowDecimal = true,
  ...rest
}) {
  const [txt, setTxt] = useState(value ?? "");

  useEffect(() => {
    // Mostrar vacío si viene undefined/null; 0 debe verse como "0"
    setTxt(value === 0 ? "0" : value ?? "");
  }, [value]);

  // Hasta 4 decimales por defecto
  const re = allowDecimal ? /^[0-9]*([.][0-9]{0,4})?$/ : /^[0-9]*$/;

  return (
    <Input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      placeholder="0"
      value={txt}
      onChange={(e) => {
        const v = e.target.value.replace(",", "."); // teclado numérico
        if (v === "") {
          setTxt("");
          // MUY IMPORTANTE: devolver "" para que el reducer no lo convierta a 0
          onChange?.("");
          return;
        }
        if (!re.test(v)) return;

        // Evitar ceros a la izquierda: "01" => "1" (pero mantener "0." mientras escribe)
        const normalized =
          v.startsWith("0") && v !== "0" && !v.startsWith("0.")
            ? String(parseInt(v, 10))
            : v;

        setTxt(normalized);

        if (allowDecimal) {
          onChange?.(parseFloat(normalized));
        } else {
          onChange?.(parseInt(normalized || "0", 10));
        }
      }}
      {...rest}
    />
  );
}
