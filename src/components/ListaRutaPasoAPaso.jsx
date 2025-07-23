import React from "react";

const ListaRutaPasoAPaso = ({ pedidosOrdenados }) => {
  if (!pedidosOrdenados || pedidosOrdenados.length === 0) {
    return (
      <div className="mt-6 text-center text-gray-400">
        <p className="mt-3 text-lg">📭 No hay pedidos para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-2xl font-bold text-primary">🧭 Lista paso a paso</h4>
      </div>

      <div className="space-y-4">
        {pedidosOrdenados.map((p, index) => (
          <div
            key={p.id}
            className="p-4 border shadow-md border-base-300 rounded-xl bg-base-200 animate-fade-in-up"
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-lg font-semibold text-secondary">
                🚩 Parada #{index + 1}
              </h5>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}`}
                className="btn btn-sm btn-outline btn-accent"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir en Google Maps
              </a>
            </div>

            <div className="space-y-1 text-sm text-base-content">
              <p><span className="font-semibold">👤 Cliente:</span> {p.nombre}</p>
              <p><span className="font-semibold">📌 Dirección:</span> {p.direccion}</p>
              <p><span className="font-semibold">📱 Teléfono:</span> {p.telefono}</p>
              <p><span className="font-semibold">📝 Pedido:</span> {p.pedido}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListaRutaPasoAPaso;
