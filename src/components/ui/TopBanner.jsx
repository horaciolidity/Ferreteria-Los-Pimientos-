// src/components/ui/TopBanner.jsx
import React from 'react';

export default function TopBanner({
  image = '/hero.jpg',     // poné tu imagen en /public (ej: /public/hero.jpg)
  height = 260,            // alto del banner en px (cambiá a gusto)
  opacity = 0.6,           // transparencia de la foto
  className = '',
  children,
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* Capa de imagen */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${image})`,
          opacity,
          filter: 'saturate(0.95) contrast(1.05)',
        }}
      />

      {/* Capa de degradado para que el texto se lea mejor y se desvanezca hacia abajo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Contenido del banner */}
      <div className="relative h-full flex items-center px-4 md:px-8">
        {children}
      </div>
    </div>
  );
}
