import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

function PanelStock() {
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState("");

  const cargarStock = async () => {
    const snap = await getDocs(collection(db, "productos"));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setProductos(data);
  };

  useEffect(() => {
    cargarStock();
  }, []);

  const productosFiltrados = productos
    .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold text-black">📦 Panel de Stock</h2>

<input
  type="text"
  placeholder="🔍 Buscar producto..."
  className="w-full max-w-md mb-4 input input-bordered text-base-content"
  value={filtro}
  onChange={(e) => setFiltro(e.target.value)}
/>


      <div className="overflow-x-auto shadow-md rounded-xl">
        <table className="table w-full border border-base-300">
          <thead className="bg-base-200 text-base-content">
            <tr>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-center">Mínimo</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-base-100 text-base-content">
            {productosFiltrados.map((p) => {
              const bajo = p.stock <= p.stockMinimo;
              return (
                <tr
                  key={p.id}
                  className="transition-colors border-t hover:bg-base-200 border-base-200"
                >
                  <td className="px-4 py-2">{p.nombre}</td>
                  <td className="text-center">{p.stock}</td>
                  <td className="text-center">{p.stockMinimo}</td>
                  <td className="text-center">
                    {bajo ? (
                      <span className="badge badge-error">Bajo</span>
                    ) : (
                      <span className="badge badge-success">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PanelStock;
