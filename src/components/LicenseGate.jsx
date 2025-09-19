// /src/components/LicenseGate.jsx
import React, { useEffect, useState } from "react";
import { isActivated, tryActivate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LicenseGate({ children }) {
  const [ok, setOk] = useState(null);
  const [serial, setSerial] = useState("");

  useEffect(() => {
    (async () => setOk(await isActivated()))();
  }, []);

  if (ok === null) return null;

  if (ok) {
    return (
      <div className="relative">
        {/* Leyenda sutil en el pie de la app */}
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-xs opacity-60 px-3 py-1 rounded-full bg-muted/40 backdrop-blur">
          Software garantido <b>horacio.dev.sol@gmail.com</b> · tecnología de vanguardia
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-2xl shadow p-6 space-y-4 border">
        <h2 className="text-lg font-semibold text-center">Activación requerida</h2>
        <p className="text-sm text-muted-foreground text-center">
          Ingresa tu serial de activación para este equipo. Se valida una sola vez y queda guardado.
        </p>
        <Input
          placeholder="Ingresa tu serial"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={async () => {
            const done = await tryActivate(serial);
            if (done) window.location.reload();
            else alert("Serial inválido.");
          }}
        >
          Activar
        </Button>
      </div>
    </div>
  );
}
