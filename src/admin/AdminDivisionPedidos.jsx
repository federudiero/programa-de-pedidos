import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  updateDoc,
  doc,
  getDoc,
  deleteField
} from "firebase/firestore";
import { startOfDay, endOfDay } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";

function AdminDivisionPedidos() {
  const navigate = useNavigate();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tema automático claro/oscuro
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedTheme = localStorage.getItem("theme");
    const initialTheme = savedTheme || (prefersDark ? "night" : "light");
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  const repartidores = [
    { label: "R1", email: "repartidor1@gmail.com" },
    { label: "R2", email: "repartidor2@gmail.com" },
    { label: "R3", email: "repartidor3@gmail.com" },
    { label: "R4", email: "repartidor4@gmail.com" },
  ];

  const cargarPedidosPorFecha = async (fecha) => {
    setLoading(true);
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));

    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, where("fecha", ">=", inicio), where("fecha", "<=", fin));
    const querySnapshot = await getDocs(q);

    const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setPedidos(data);
    setLoading(false);
  };

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAutenticado");
    if (!adminAuth) navigate("/admin");
    else cargarPedidosPorFecha(fechaSeleccionada);
  }, [fechaSeleccionada]);

  const handleAsignar = async (pedidoId, email, asignar) => {
    const pedidoRef = doc(db, "pedidos", pedidoId);
    const pedidoSnap = await getDoc(pedidoRef);
    const pedidoData = pedidoSnap.data();

    const actual = Array.isArray(pedidoData.asignadoA) ? pedidoData.asignadoA : [];
    const nuevo = asignar
      ? [...new Set([...actual, email])]
      : actual.filter(e => e !== email);

    await updateDoc(pedidoRef, { asignadoA: nuevo });

    if (nuevo.length === 0) {
      await updateDoc(pedidoRef, { ordenRuta: deleteField() });
    }

    cargarPedidosPorFecha(fechaSeleccionada);
  };

  return (
    <div className="max-w-6xl px-4 py-6 mx-auto text-base-content">
      <h2 className="mb-4 text-2xl font-bold text-black"> División de Pedidos por Repartidor</h2>

      <div className="mb-5">
        <label className="block mb-1 font-semibold">📅 Seleccionar fecha:</label>
        <DatePicker
          selected={fechaSeleccionada}
          onChange={(date) => setFechaSeleccionada(date)}
          className="w-full max-w-sm input input-bordered"
        />
      </div>

      {loading ? (
        <p className="text-lg">Cargando pedidos...</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-xl">
          <table className="table w-full text-sm border border-base-300">
            <thead className="bg-base-200 text-base-content">
              <tr>
                <th className="py-2">👤 Cliente</th>
                <th className="py-2">📌 Dirección</th>
                <th className="py-2">📝 Pedido</th>
                {repartidores.map((r) => (
                  <th key={r.email} className="py-2 text-center">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-base-100">
              {pedidos.map((p) => (
                <tr key={p.id} className="border-t border-base-300">
                  <td className="py-2 font-semibold">{p.nombre}</td>
                  <td className="py-2">{p.direccion}</td>
                  <td className="py-2 whitespace-pre-wrap">{p.pedido}</td>
                  {repartidores.map((r) => (
                    <td key={r.email} className="py-2 text-center">
                      <input
                        type="checkbox"
                        className={`checkbox checkbox-sm rounded ${p.asignadoA?.includes(r.email) ? "border-green-500 bg-green-500" : ""}`}
                        checked={p.asignadoA?.includes(r.email) || false}
                        onChange={(e) => handleAsignar(p.id, r.email, e.target.checked)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        className="mt-5 btn btn-neutral hover:text-black"
        onClick={() => navigate("/admin/pedidos")}
      >
        ⬅ Volver a pedidos
      </button>
    </div>
  );
}

export default AdminDivisionPedidos;
