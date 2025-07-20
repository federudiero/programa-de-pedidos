// src/components/RutasDivididas.js
import React, { useState } from "react";
import RutaOptimizada from "./RutaOptimizada";

const RutasDivididas = ({ pedidos, base }) => {
  const [rutaActual, setRutaActual] = useState(0);
  const [instrucciones, setInstrucciones] = useState([]);
  const tamTramo = 10;

  const rutas = [];
  for (let i = 0; i < pedidos.length; i += tamTramo) {
    const tramo = pedidos.slice(i, i + tamTramo);
    const origen = i === 0 ? base : pedidos[i - 1];
    const destino = i + tamTramo >= pedidos.length ? base : tramo[tramo.length - 1];
    const waypoints = tramo.slice(0, -1);
    rutas.push({ origen, destino, waypoints });
  }

  const { origen, destination, waypoints } = rutas[rutaActual] || {};

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {rutas.map((_, idx) => (
          <button
            key={idx}
            className={`btn ${idx === rutaActual ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              setRutaActual(idx);
              setInstrucciones([]); // limpia instrucciones al cambiar de ruta
            }}
          >
            Ruta {idx + 1}
          </button>
        ))}
      </div>

      <RutaOptimizada
        origin={origen}
        destination={destination}
        waypoints={waypoints}
        setInstrucciones={setInstrucciones}
      />

      {instrucciones.length > 0 && (
        <div className="p-4 bg-base-200 rounded-box">
          <h2 className="mb-2 text-lg font-bold">📍 Instrucciones Paso a Paso</h2>
          <ol className="space-y-1 list-decimal list-inside">
            {instrucciones.map((inst, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: inst }} />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default RutasDivididas;
