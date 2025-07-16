import React from "react";

const ListaRutaPasoAPaso = ({ pedidosOrdenados }) => {
  if (!pedidosOrdenados || pedidosOrdenados.length === 0) {
    return <p className="mt-3">📭 No hay pedidos para mostrar.</p>;
  }

  return (
    <div className="mt-6">
      <h4 className="text-xl font-semibold mb-4">🧭 Lista paso a paso</h4>

      <div className="space-y-4">
        {pedidosOrdenados.map((p) => (
          <div
            key={p.id}
            className="border rounded-lg p-4 bg-base-100 shadow-md"
          >
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-lg font-bold">🚩 Parada #{p.ordenRuta}</h5>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}`}
                className="btn btn-outline btn-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ir con Google Maps
              </a>
            </div>

            <div className="text-sm space-y-1">
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
