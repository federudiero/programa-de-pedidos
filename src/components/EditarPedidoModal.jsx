import React, { useState, useEffect } from "react";

const EditarPedidoModal = ({ show, onClose, pedido, onGuardar }) => {
  const [form, setForm] = useState({
    nombre: "",
    direccion: "",
    entreCalles: "",
    partido: "",
    telefono: "",
    pedido: ""
  });

  useEffect(() => {
    if (pedido) setForm({ ...pedido });
  }, [pedido]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGuardar = () => {
    onGuardar(form);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">✏️ Editar Pedido</h2>
          <button onClick={onClose} className="btn btn-sm btn-error text-white">✖</button>
        </div>

        <form className="grid gap-4">
          {["nombre", "direccion", "entreCalles", "partido", "telefono", "pedido"].map((campo, i) => (
            <div key={i}>
              <label className="block font-semibold capitalize">{campo}</label>
              {campo === "pedido" ? (
                <textarea
                  name={campo}
                  rows={3}
                  className="textarea textarea-bordered w-full"
                  value={form[campo]}
                  onChange={handleChange}
                />
              ) : (
                <input
                  type="text"
                  name={campo}
                  className="input input-bordered w-full"
                  value={form[campo]}
                  onChange={handleChange}
                />
              )}
            </div>
          ))}
        </form>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button onClick={handleGuardar} className="btn btn-primary">Guardar cambios</button>
        </div>
      </div>
    </div>
  );
};

export default EditarPedidoModal;
