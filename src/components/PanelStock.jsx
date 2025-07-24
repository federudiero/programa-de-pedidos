import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

import AdminNavbar from "../components/AdminNavbar";

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
    <div className="p-6 text-base-content">
    <AdminNavbar/>
      
      <h2 className="mb-4 text-3xl font-bold text-primary">📦 Panel de Stock</h2>

      <input
        type="text"
        placeholder="🔍 Buscar producto..."
        className="w-full max-w-md mb-6 input input-bordered"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />

      <div className="overflow-x-auto border shadow-xl rounded-xl border-base-300">
        <table className="table w-full">
          <thead className="bg-base-200 text-base-content">
            <tr>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-center">Mínimo</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-base-100">
            {productosFiltrados.map((p) => {
              const bajo = p.stock <= p.stockMinimo;
              return (
                <tr
                  key={p.id}
                  className="transition-colors border-t hover:bg-base-200 border-base-300"
                >
                  <td className="px-4 py-3">{p.nombre}</td>
                  <td className="text-center">{p.stock}</td>
                  <td className="text-center">{p.stockMinimo}</td>
                  <td className="text-center">
                    <span className={`badge ${bajo ? "badge-error" : "badge-success"}`}>
                      {bajo ? "Bajo" : "OK"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {productosFiltrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PanelStock;
