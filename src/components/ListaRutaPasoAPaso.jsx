import React from "react";

const ListaRutaPasoAPaso = ({ pedidosOrdenados }) => {
  if (!pedidosOrdenados || pedidosOrdenados.length === 0) {
    return <p className="mt-3">📭 No hay pedidos para mostrar.</p>;
  }

  return (
    <div className="mt-6">
      <h4 className="mb-4 text-xl font-semibold">🧭 Lista paso a paso</h4>

      <div className="space-y-4">
        {pedidosOrdenados.map((p, index) => (
          <div
            key={p.id}
            className="p-4 border rounded-lg shadow-md bg-base-100"
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-lg font-bold">🚩 Parada #{index + 1}</h5>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}`}
                className="btn btn-outline btn-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ir con Google Maps
              </a>
            </div>

            <div className="space-y-1 text-sm">
              <p><strong>👤 Cliente:</strong> {p.nombre}</p>
              <p><strong>📌 Dirección:</strong> {p.direccion}</p>
              <p><strong>📱 Teléfono:</strong> {p.telefono}</p>
              <p><strong>📝 Pedido:</strong> {p.pedido}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListaRutaPasoAPaso;
