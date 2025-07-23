import React, { useEffect, useState } from "react";
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
  updateDoc,
} from "firebase/firestore";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import EditarPedidoModal from "../components/EditarPedidoModal";


function AdminPedidos() {
  const navigate = useNavigate();
  const fechaGuardada = localStorage.getItem("fechaSeleccionadaAdmin");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    fechaGuardada ? new Date(fechaGuardada) : new Date()
  );
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [pedidoAEditar, setPedidoAEditar] = useState(null);

  const cargarPedidosPorFecha = async (fecha) => {
    setLoading(true);
    const start = new Date(fecha);
    start.setHours(0, 0, 0, 0);
    const end = new Date(fecha);
    end.setHours(23, 59, 59, 999);
    const inicio = Timestamp.fromDate(start);
    const fin = Timestamp.fromDate(end);
    const pedidosRef = collection(db, "pedidos");
    const q = query(
      pedidosRef,
      where("fecha", ">=", inicio),
      where("fecha", "<=", fin)
    );
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
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
      const { id, productos = [], ...resto } = pedidoEditado;

      const resumen = productos
        .map((p) => `${p.nombre} x${p.cantidad}`)
        .join(" - ");

      const total = productos.reduce(
        (acc, p) => acc + (p.precio || 0) * p.cantidad,
        0
      );

      const pedidoStr = `${resumen} | TOTAL: $${total}`;

      await updateDoc(doc(db, "pedidos", id), {
        ...resto,
        productos,
        pedido: pedidoStr,
      });

      setModalVisible(false);
      cargarPedidosPorFecha(fechaSeleccionada);
    } catch (error) {
      alert("❌ Error al guardar cambios: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="max-w-6xl px-4 py-6 mx-auto">
        {/* ENCABEZADO */}
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold">
            📋 Pedidos del Día - Administrador
          </h2>

          {/* Navbar responsive */}
          <div className="dropdown dropdown-end md:hidden">
            <button tabIndex={0} className="btn btn-outline">
              ☰ Menú
            </button>
            <ul
              tabIndex={0}
              className="z-10 p-2 shadow dropdown-content menu bg-base-200 rounded-box w-52"
            >
              <li>
                <button onClick={cerrarSesion}>🔓 Cerrar sesión</button>
              </li>
              <li>
                <button onClick={() => navigate("/admin/dividir-pedidos")}>
                  🗂 División de Pedidos
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/admin/stock")}>
                  🧾 Ver Stock
                </button>
              </li>
              <li>
                <button className="btn btn-outline" onClick={() => navigate("/admin/cierre-caja")}>
              📦 Ir a Cierre de Caja
            </button>
              </li>
              <li>
                <button onClick={() => navigate("/")}>⬅ Volver a Home</button>
              </li>
              <li>
              
              </li>
            </ul>
          </div>

          {/* Barra visible en escritorio */}
          <div className="flex-wrap hidden gap-2 md:flex">
           
            <button
              className="btn btn-error btn-outline"
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </button>
            <button
              className="btn btn-info btn-outline"
              onClick={() => navigate("/admin/dividir-pedidos")}
            >
              🗂 División de Pedidos
            </button>
            <button
              className="btn btn-outline btn-success"
              onClick={() => navigate("/admin/stock")}
            >
              🧾 Ver Stock
            </button>
            <button className="btn btn-outline" onClick={() => navigate("/admin/cierre-caja")}>
              📦 Ir a Cierre de Caja
            </button>
            <button onClick={() => navigate("/admin/estadisticas")} className="btn btn-outline">
  📈 Ver estadísticas
</button>

            <button className="btn btn-outline" onClick={() => navigate("/")}>
              ⬅ Volver a Home
            </button>
          </div>
        </div>

        {/* Fecha */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold text-base-content">
            📅 Seleccionar fecha:
          </label>
          <DatePicker
            selected={fechaSeleccionada}
            onChange={handleFechaChange}
            className="w-full max-w-xs input input-bordered"
          />
        </div>

        {/* Tabla o estado */}
        {loading ? (
          <div className="mt-10 text-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4">Cargando pedidos...</p>
          </div>
        ) : pedidos.length > 0 ? (
          <>
            <div className="mb-4 overflow-x-auto shadow-xl bg-base-200 rounded-xl">
              <table className="table w-full text-sm table-zebra text-base-content">
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
                    const direccionPartes =
                      pedido.direccion?.split(",").map((x) => x.trim()) || [];
                    const ciudad = direccionPartes[0] || "-";
                    const provincia = direccionPartes[1] || "-";

                    return (
                      <tr key={pedido.id}>
                        <td>{index + 1}</td>
                        <td>{pedido.nombre}</td>
                        <td>{provincia}</td>
                        <td>{ciudad}</td>
                        <td></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span>{pedido.direccion}</span>
                            {pedido.direccion && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  pedido.direccion
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
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
                          {pedido.pedido || (
                            <span className="italic text-base-300">
                              Sin detalles
                            </span>
                          )}
                        </td>
                        <td>{pedido.entreCalles || "-"}</td>
                        <td className="flex flex-col gap-1 md:flex-row">
                          <button
                            className="btn btn-xs btn-warning"
                            onClick={() => editarPedido(pedido)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-xs btn-error"
                            onClick={() => eliminarPedido(pedido.id)}
                          >
                            Eliminar
                          </button>
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
          <p className="mt-8 text-center text-base-300">
            📭 No hay pedidos para esta fecha.
          </p>
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
