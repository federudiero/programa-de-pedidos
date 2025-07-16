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
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">🗂 División de Pedidos por Repartidor</h2>

      <div className="mb-5">
        <label className="font-semibold mb-1 block">📅 Seleccionar fecha:</label>
        <DatePicker
          selected={fechaSeleccionada}
          onChange={(date) => setFechaSeleccionada(date)}
          className="input input-bordered w-full max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-lg">Cargando pedidos...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead className="bg-base-200 text-base font-bold">
              <tr>
                <th>👤 Cliente</th>
                <th>📌 Dirección</th>
                <th>📝 Pedido</th>
                {repartidores.map((r) => (
                  <th key={r.email} className="text-center">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className={p.asignadoA?.length > 0 ? "bg-green-100" : ""}>
                  <td className="font-semibold">{p.nombre}</td>
                  <td>{p.direccion}</td>
                  <td className="whitespace-pre-wrap">{p.pedido}</td>
                  {repartidores.map((r) => (
                    <td key={r.email} className="text-center">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
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
        className="btn btn-neutral mt-5"
        onClick={() => navigate("/admin/pedidos")}
      >
        ⬅ Volver a pedidos
      </button>
    </div>
  );
}

export default AdminDivisionPedidos;
