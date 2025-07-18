// src/pages/AdminStock.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { nanoid } from "nanoid";
import { useNavigate } from "react-router-dom";

function AdminStock() {
    const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", precio: "", stock: 0, stockMinimo: 10 });

  const cargarProductos = async () => {
    const snapshot = await getDocs(collection(db, "productos"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProductos(data);
  };

  const actualizarProducto = async (producto) => {
    await updateDoc(doc(db, "productos", producto.id), producto);
    cargarProductos();
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

  return (
    <div className="min-h-screen p-6 bg-base-200 text-base-content">
      <div className="max-w-4xl mx-auto">
        <h2 className="mb-6 text-2xl font-bold">📦 Gestión de Stock</h2>

        <div className="p-4 mb-6 border shadow rounded-xl bg-base-100">
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

        <div className="grid gap-4">
          {productos.map((prod) => (
            <div key={prod.id} className="p-4 border shadow bg-base-100 rounded-xl">
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
       <button className="hover:text-black btn btn-outline" onClick={() => navigate("/admin/pedidos")}>
              ⬅ Volver a Administrador
            </button>
    </div>
  );
}

export default AdminStock;
