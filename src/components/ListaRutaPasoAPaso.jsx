import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

const ListaRutaPasoAPaso = ({ pedidosOrdenados, onReordenar, bloqueado }) => {
  if (!pedidosOrdenados || pedidosOrdenados.length === 0) {
    return (
      <div className="mt-6 text-center text-gray-400">
        <p className="mt-3 text-lg">📭 No hay pedidos para mostrar.</p>
      </div>
    );
  }

  const handleDragEnd = (result) => {
    if (!result.destination || bloqueado) return;
    const nuevaLista = Array.from(pedidosOrdenados);
    const [moved] = nuevaLista.splice(result.source.index, 1);
    nuevaLista.splice(result.destination.index, 0, moved);
    onReordenar(nuevaLista); // esto actualiza el orden en Firestore y estado
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-2xl font-bold text-primary">🧭 Lista paso a paso</h4>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="lista-pedidos">
          {(provided) => (
            <div
              className="space-y-4"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {pedidosOrdenados.map((p, index) => (
                <Draggable
                  key={p.id}
                  draggableId={p.id}
                  index={index}
                  isDragDisabled={bloqueado}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
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
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default ListaRutaPasoAPaso;
