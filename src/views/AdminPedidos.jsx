import React, { useEffect, useState } from "react";
import PedidoTabla from "../components/PedidoTabla";
import ExportarExcel from "../components/ExportarExcel";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc
} from "firebase/firestore";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import { FaMoon, FaSun } from "react-icons/fa";
import EditarPedidoModal from "../components/EditarPedidoModal";

function AdminPedidos() {
  const navigate = useNavigate();
  const fechaGuardada = localStorage.getItem("fechaSeleccionadaAdmin");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    fechaGuardada ? new Date(fechaGuardada) : new Date()
  );
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("modoOscuro") === "true";
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [pedidoAEditar, setPedidoAEditar] = useState(null);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const nuevoModo = !prev;
      localStorage.setItem("modoOscuro", nuevoModo);
      return nuevoModo;
    });
  };

  const cargarPedidosPorFecha = async (fecha) => {
    setLoading(true);
    const start = new Date(fecha);
    start.setHours(0, 0, 0, 0);
    const end = new Date(fecha);
    end.setHours(23, 59, 59, 999);
    const inicio = Timestamp.fromDate(start);
    const fin = Timestamp.fromDate(end);
    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, where("fecha", ">=", inicio), where("fecha", "<=", fin));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(docSnap => ({
      ...docSnap.data(),
      id: docSnap.id
    }));
    setPedidos(data);
    setLoading(false);
  };

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAutenticado");
    if (!adminAuth) {
      navigate("/admin");
    } else {
      cargarPedidosPorFecha(fechaSeleccionada);
    }
  }, [fechaSeleccionada, navigate]);

  const handleFechaChange = (date) => {
    setFechaSeleccionada(date);
    localStorage.setItem("fechaSeleccionadaAdmin", date);
  };

  const cerrarSesion = () => {
    localStorage.removeItem("adminAutenticado");
    localStorage.removeItem("fechaSeleccionadaAdmin");
    navigate("/");
  };

  const eliminarPedido = async (id) => {
    if (confirm("¿Seguro que querés eliminar este pedido?")) {
      try {
        await deleteDoc(doc(db, "pedidos", id));
        cargarPedidosPorFecha(fechaSeleccionada);
      } catch (error) {
        alert("❌ Error al eliminar: " + error.message);
      }
    }
  };

  const editarPedido = (pedido) => {
    setPedidoAEditar(pedido);
    setModalVisible(true);
  };

  const guardarCambios = async (pedidoEditado) => {
    try {
      const { id, ...resto } = pedidoEditado;
      await updateDoc(doc(db, "pedidos", id), resto);
      setModalVisible(false);
      cargarPedidosPorFecha(fechaSeleccionada);
    } catch (error) {
      alert("❌ Error al guardar cambios: " + error.message);
    }
  };

  return (
    <div className={`${darkMode ? "bg-base-200 text-base-content" : "bg-base-100 text-base-content"} min-h-screen`}>
      <div className="max-w-6xl px-4 py-6 mx-auto">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold">📋 Pedidos del Día - Administrador</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-outline" onClick={toggleDarkMode}>
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <button className="btn btn-error btn-outline" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
            <button className="btn btn-info btn-outline" onClick={() => navigate("/admin/dividir-pedidos")}>
              🗂 División de Pedidos
            </button>
            <button
  className="btn btn-outline btn-success"
  onClick={() => navigate("/admin/stock")}
>
  🧾 Ver Stock
</button>
            <button className="btn btn-outline" onClick={() => navigate("/")}>
              ⬅ Volver a Home
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-semibold">📅 Seleccionar fecha:</label>
          <DatePicker
            selected={fechaSeleccionada}
            onChange={handleFechaChange}
            className="w-full max-w-xs input input-bordered"
          />
        </div>
{loading ? (
  <div className="mt-10 text-center">
    <span className="loading loading-spinner loading-lg text-primary"></span>
    <p className="mt-4">Cargando pedidos...</p>
  </div>
) : pedidos.length > 0 ? (
  <>
   <div className="mb-4 overflow-x-auto shadow-xl bg-base-100 rounded-xl">
  <table className="table w-full text-sm table-zebra">
    <thead className="font-bold bg-base-300 text-base-content">
      <tr>
        <th>#</th>
        <th>NOMBRE</th>
        <th>PROVINCIA</th>
        <th>CIUDAD</th>
        <th>ORDEN</th>
        <th>CALLE Y ALTURA</th>
        <th>TELEFONO</th>
        <th>VENDEDOR</th>
        <th>PEDIDO</th>
        <th>OBSERVACION</th>
        <th>ACCIONES</th>
      </tr>
    </thead>
    <tbody>
      {pedidos.map((pedido, index) => {
        const direccionPartes = pedido.direccion?.split(",").map(x => x.trim()) || [];
        const ciudad = direccionPartes[0] || "-";
        const provincia = direccionPartes[1] || "-";

        return (
          <tr key={pedido.id}>
            <td>{index + 1}</td>
            <td>{pedido.nombre}</td>
            <td>{provincia}</td>
            <td>{ciudad}</td>
            <td></td> {/* Columna ORDEN vacía */}
           <td>
  <div className="flex items-center gap-2">
    <span>{pedido.direccion}</span>
    {pedido.direccion && (
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.direccion)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
        title="Abrir en Google Maps"
      >
        📍
      </a>
    )}
  </div>
</td>
            <td>{pedido.telefono}</td>
            <td>{pedido.vendedorEmail || "-"}</td>
            <td className="whitespace-pre-wrap">
              {pedido.pedido || <span className="italic text-gray-400">Sin detalles</span>}
            </td>
            <td>{pedido.entreCalles || "-"}</td>
            <td className="flex flex-col gap-1 md:flex-row">
              <button className="btn btn-xs btn-warning" onClick={() => editarPedido(pedido)}>Editar</button>
              <button className="btn btn-xs btn-error" onClick={() => eliminarPedido(pedido.id)}>Eliminar</button>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>

    <ExportarExcel pedidos={pedidos} />
  </>
) : (
  <p className="mt-8 text-center text-gray-400">📭 No hay pedidos para esta fecha.</p>
)}
      </div>

      <EditarPedidoModal
        show={modalVisible}
        onClose={() => setModalVisible(false)}
        pedido={pedidoAEditar}
        onGuardar={guardarCambios}
      />
    </div>
  );
}

export default AdminPedidos;
