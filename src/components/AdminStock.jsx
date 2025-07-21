import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { nanoid } from "nanoid";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function AdminStock() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", precio: "", stock: 0, stockMinimo: 10 });

  // Detectar modo del sistema y aplicar tema
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "night" : "light");
  }, []);

  const cargarProductos = async () => {
    const snapshot = await getDocs(collection(db, "productos"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProductos(data);
  };

 const actualizarProducto = async (producto) => {
  try {
    await updateDoc(doc(db, "productos", producto.id), producto);
    Swal.fire({
      icon: "success",
      title: "Guardado",
      text: `El producto "${producto.nombre}" se guardó correctamente.`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
    cargarProductos();
  } catch (error) {
    console.error(error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Hubo un problema al guardar el producto.",
    });
  }
};

  const agregarProducto = async () => {
    const id = nanoid();
    await setDoc(doc(db, "productos", id), {
      nombre: nuevoProducto.nombre,
      precio: parseInt(nuevoProducto.precio),
      stock: parseInt(nuevoProducto.stock),
      stockMinimo: parseInt(nuevoProducto.stockMinimo)
    });
    setNuevoProducto({ nombre: "", precio: "", stock: 0, stockMinimo: 10 });
    cargarProductos();
  };

  const eliminarProducto = async (id) => {
    await deleteDoc(doc(db, "productos", id));
    cargarProductos();
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // Ordenar y filtrar productos
  const productosFiltrados = productos
    .filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="mb-6 text-2xl font-bold">📦 Gestión de Stock</h2>

        <div className="p-4 mb-6 border shadow rounded-xl bg-base-100 text-base-content">
          <h3 className="mb-2 font-semibold">➕ Agregar producto</h3>
          <div className="grid gap-2 md:grid-cols-4">
            <input className="input input-bordered" placeholder="Nombre"
              value={nuevoProducto.nombre}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
            />
            <input className="input input-bordered" placeholder="Precio" type="number"
              value={nuevoProducto.precio}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
            />
            <input className="input input-bordered" placeholder="Stock" type="number"
              value={nuevoProducto.stock}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })}
            />
            <input className="input input-bordered" placeholder="Stock mínimo" type="number"
              value={nuevoProducto.stockMinimo}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, stockMinimo: e.target.value })}
            />
          </div>
          <button onClick={agregarProducto} className="w-full mt-4 btn btn-success">Agregar producto</button>
        </div>

        <input
          type="text"
          placeholder="🔍 Buscar producto..."
          className="w-full max-w-md mb-6 input input-bordered text-base-content"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />

        <div className="grid gap-4">
          {productosFiltrados.map((prod) => (
            <div key={prod.id} className="p-4 border shadow bg-base-100 text-base-content rounded-xl">
              <div className="grid gap-2 md:grid-cols-4">
                <input className="input input-bordered" value={prod.nombre}
                  onChange={(e) => setProductos(p => p.map(pr => pr.id === prod.id ? { ...pr, nombre: e.target.value } : pr))}
                />
                <input className="input input-bordered" type="number" value={prod.precio}
                  onChange={(e) => setProductos(p => p.map(pr => pr.id === prod.id ? { ...pr, precio: parseInt(e.target.value) } : pr))}
                />
                <input className="input input-bordered" type="number" value={prod.stock}
                  onChange={(e) => setProductos(p => p.map(pr => pr.id === prod.id ? { ...pr, stock: parseInt(e.target.value) } : pr))}
                />
                <input className="input input-bordered" type="number" value={prod.stockMinimo}
                  onChange={(e) => setProductos(p => p.map(pr => pr.id === prod.id ? { ...pr, stockMinimo: parseInt(e.target.value) } : pr))}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="btn btn-warning btn-sm" onClick={() => actualizarProducto(prod)}>💾 Guardar</button>
                <button className="btn btn-error btn-sm" onClick={() => eliminarProducto(prod.id)}>🗑️ Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-6 md:flex-row md:justify-between">
        <button className="btn btn-outline" onClick={() => navigate("/admin/pedidos")}>
          ⬅ Volver a Administrador
        </button>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={() => navigate("/admin/cierre-caja")}>📦 Ir a Cierre de Caja</button>
          <button className="btn btn-outline" onClick={() => navigate("/admin/panel-stock")}>📊 Ver Stock</button>
        </div>
      </div>
    </div>
  );
}

export default AdminStock;
