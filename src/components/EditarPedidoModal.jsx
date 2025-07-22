import React, { useState, useEffect } from "react";

const EditarPedidoModal = ({ show, onClose, pedido, onGuardar }) => {
  const [form, setForm] = useState({
    nombre: "",
    direccion: "",
    entreCalles: "",
    partido: "",
    telefono: "",
    productos: [],
  });

  useEffect(() => {
    if (pedido) {
      setForm({
        nombre: pedido.nombre || "",
        direccion: pedido.direccion || "",
        entreCalles: pedido.entreCalles || "",
        partido: pedido.partido || "",
        telefono: pedido.telefono || "",
        productos: Array.isArray(pedido.productos) ? pedido.productos : [],
      });
    }
  }, [pedido]);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleProductoChange = (index, campo, valor) => {
    const nuevos = [...form.productos];
    nuevos[index][campo] = campo === "cantidad" || campo === "precio" ? parseInt(valor) || 0 : valor;
    setForm({ ...form, productos: nuevos });
  };

  const agregarProducto = () => {
    setForm({
      ...form,
      productos: [...form.productos, { nombre: "", cantidad: 1, precio: 0 }],
    });
  };

  const eliminarProducto = (index) => {
    const nuevos = [...form.productos];
    nuevos.splice(index, 1);
    setForm({ ...form, productos: nuevos });
  };

  const calcularResumen = () => {
    const resumen = form.productos
      .map((p) => `${p.nombre} x${p.cantidad} ($${(p.precio || 0) * p.cantidad})`)
      .join(" - ");
    const total = form.productos.reduce(
      (acc, p) => acc + (p.precio || 0) * p.cantidad,
      0
    );
    return { resumen, total };
  };

  const handleGuardar = () => {
    const { resumen, total } = calcularResumen();
    const pedidoFinal = `${resumen} | TOTAL: $${total}`;
    onGuardar({
      ...pedido,
      ...form,
      pedido: pedidoFinal,
      productos: form.productos,
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl p-6 bg-white shadow-lg rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">✏️ Editar Pedido</h2>
          <button onClick={onClose} className="text-white btn btn-sm btn-error">✖</button>
        </div>

        <form className="grid gap-4">
          {["nombre", "direccion", "entreCalles", "partido", "telefono"].map((campo, i) => (
            <div key={i}>
              <label className="block font-semibold capitalize">{campo}</label>
              <input
                type="text"
                name={campo}
                className="w-full input input-bordered"
                value={form[campo]}
                onChange={handleInputChange}
              />
            </div>
          ))}

          <div>
            <h3 className="mt-2 mb-1 font-semibold">🛒 Productos</h3>
            {form.productos.map((prod, i) => (
              <div key={i} className="grid items-center grid-cols-12 gap-2 mb-2">
                <input
                  className="col-span-5 input input-bordered"
                  placeholder="Nombre"
                  value={prod.nombre}
                  onChange={(e) => handleProductoChange(i, "nombre", e.target.value)}
                />
                <input
                  className="col-span-2 input input-bordered"
                  type="number"
                  placeholder="Cant."
                  value={prod.cantidad}
                  onChange={(e) => handleProductoChange(i, "cantidad", e.target.value)}
                />
                <input
                  className="col-span-3 input input-bordered"
                  type="number"
                  placeholder="Precio"
                  value={prod.precio}
                  onChange={(e) => handleProductoChange(i, "precio", e.target.value)}
                />
                <button
                  className="col-span-2 btn btn-sm btn-error"
                  onClick={() => eliminarProducto(i)}
                  type="button"
                >
                  ❌
                </button>
              </div>
            ))}
            <button type="button" className="mt-2 btn btn-sm btn-outline" onClick={agregarProducto}>
              ➕ Agregar Producto
            </button>
          </div>

          <div>
            <label className="block font-semibold">🧾 Pedido generado:</label>
            <textarea
              className="w-full textarea textarea-bordered"
              readOnly
              rows={3}
              value={`${calcularResumen().resumen} | TOTAL: $${calcularResumen().total}`}
            />
          </div>
        </form>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button onClick={handleGuardar} className="btn btn-primary">Guardar cambios</button>
        </div>
      </div>
    </div>
  );
};

export default EditarPedidoModal;
