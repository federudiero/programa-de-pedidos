import React, { useState } from "react";
import RutaOptimizada from "./RutaOptimizada";

const RutasDivididas = ({ pedidos, base }) => {
  const [rutaActual, setRutaActual] = useState(0);
  const tamTramo = 10;

  const rutas = [];
  for (let i = 0; i < pedidos.length; i += tamTramo) {
    const tramo = pedidos.slice(i, i + tamTramo);
    const origen = i === 0 ? base : pedidos[i - 1];
    const destino = i + tamTramo >= pedidos.length ? base : tramo[tramo.length - 1];
    const waypoints = tramo.slice(0, -1);
    rutas.push({ origen, destino, waypoints });
  }

  const { origen, destino, waypoints } = rutas[rutaActual] || {};

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {rutas.map((_, idx) => (
          <button
            key={idx}
            className={`btn ${idx === rutaActual ? "btn-primary" : "btn-outline"}`}
            onClick={() => setRutaActual(idx)}
          >
            Ruta {idx + 1}
          </button>
        ))}
      </div>

      <RutaOptimizada
        origin={origen}
        destination={destino}
        waypoints={waypoints}
      />
    </div>
  );
};

export default RutasDivididas;
