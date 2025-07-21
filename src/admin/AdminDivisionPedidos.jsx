import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import {
  collection, getDocs, query, where,
  Timestamp, updateDoc, doc, deleteField
} from "firebase/firestore";
import { startOfDay, endOfDay } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";

// Repartidores
const repartidores = [
  { label: "R1", email: "repartidor1@gmail.com" },
  { label: "R2", email: "repartidor2@gmail.com" },
  { label: "R3", email: "repartidor3@gmail.com" },
  { label: "R4", email: "repartidor4@gmail.com" },
  { label: "R5", email: "repartidor5@gmail.com" },
  { label: "R6", email: "repartidor6@gmail.com" },
  { label: "R7", email: "repartidor7@gmail.com" },
  { label: "R8", email: "repartidor8@gmail.com" },
];

// Zonas
const zonas = {
  "Zona Sur": ["lanús", "lanus", "lomas", "temperley", "banfield", "avellaneda"],
  "Zona Este": ["quilmes", "berazategui", "varela", "solano"],
  "Zona Oeste": ["morón", "moron", "ituzaingó", "ituzaingo", "castelar", "merlo", "laferrere", "san justo", "la tablada"],
  "CABA": ["caba", "capital", "comuna", "villa devoto", "palermo", "flores", "caballito", "almagro", "recoleta"],
  "Zona Norte": ["san isidro", "vicente lopez", "tigre", "escobar", "olivos"],
  "Zona La Plata": ["la plata", "tolosa", "gonnet", "ringuelet"]
};

const obtenerZona = (direccion) => {
  if (!direccion) return "Desconocida";
  const dir = direccion.toLowerCase();
  for (const [zona, barrios] of Object.entries(zonas)) {
    if (barrios.some((b) => dir.includes(b))) return zona;
  }
  return "Otras";
};

function AdminDivisionPedidos() {
  const navigate = useNavigate();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resumenPorZona, setResumenPorZona] = useState({});

  const cargarPedidosPorFecha = async (fecha) => {
    setLoading(true);
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));
    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, where("fecha", ">=", inicio), where("fecha", "<=", fin));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const resumen = {};
    data.forEach(p => {
      const zona = obtenerZona(p.direccion);
      resumen[zona] = (resumen[zona] || 0) + 1;
    });

    setPedidos(data);
    setResumenPorZona(resumen);
    setLoading(false);
  };

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAutenticado");
    if (!adminAuth) navigate("/admin");
    else cargarPedidosPorFecha(fechaSeleccionada);
  }, [fechaSeleccionada, navigate]);

 const handleAsignar = async (pedidoId, email, asignar) => {
  try {
    const pedidoRef = doc(db, "pedidos", pedidoId);

    let updateObj;
    if (asignar) {
      // ✅ Asignar nuevo repartidor reemplazando el anterior
      updateObj = { asignadoA: [email] };
    } else {
      // ❌ Desasignar (vaciar)
      updateObj = {
        asignadoA: [],
        ordenRuta: deleteField(),
      };
    }

    await updateDoc(pedidoRef, updateObj);
    cargarPedidosPorFecha(fechaSeleccionada);
  } catch (err) {
    console.error("❌ Error al asignar/desasignar repartidor:", err);
  }
};
  return (
    <div className="max-w-6xl px-4 py-6 mx-auto text-base-content">
      <h2 className="mb-4 text-2xl font-bold text-black">División de Pedidos por Repartidor</h2>

      <div className="flex flex-col gap-4 mb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <label className="block mb-1 font-semibold">📅 Seleccionar fecha:</label>
          <DatePicker
            selected={fechaSeleccionada}
            onChange={(date) => setFechaSeleccionada(date)}
            className="w-full max-w-sm input input-bordered"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-lg">Cargando pedidos...</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-xl">
          <table className="table w-full text-sm border border-base-300">
            <thead className="bg-base-200 text-base-content">
              <tr>
                <th>👤 Cliente</th>
                <th>📌 Dirección</th>
                <th>📝 Pedido</th>
                <th>📍 Zona</th>
                {repartidores.map((r) => (
                  <th key={r.email} className="text-center">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-base-100">
              {pedidos.map((p) => {
                const zona = obtenerZona(p.direccion);
                return (
                  <tr key={p.id} className="border-t border-base-300">
                    <td>{p.nombre}</td>
                    <td>{p.direccion}</td>
                    <td className="whitespace-pre-wrap">{p.pedido}</td>
                    <td>{zona}</td>
                    {repartidores.map((r) => (
                      <td key={r.email} className="text-center">
                        <input
                          type="checkbox"
                          className={`checkbox checkbox-sm ${p.asignadoA?.includes(r.email) ? "bg-green-500" : ""}`}
                          checked={p.asignadoA?.includes(r.email) || false}
                          onChange={(e) => handleAsignar(p.id, r.email, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-2 text-lg font-semibold">📊 Pedidos por zona</h3>
        <table className="table w-full max-w-lg border table-sm bg-base-100 border-base-300">
          <thead className="bg-base-200 text-base-content">
            <tr>
              <th>Zona</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(resumenPorZona).map(([zona, total]) => (
              <tr key={zona} className="border-t border-base-300">
                <td>{zona}</td>
                <td>{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className="mt-6 btn btn-neutral hover:text-black"
        onClick={() => navigate("/admin/pedidos")}
      >
        ⬅ Volver a pedidos
      </button>
    </div>
  );
}

export default AdminDivisionPedidos;
