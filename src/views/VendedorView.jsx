import React, { useState, useEffect } from "react";
import PedidoForm from "../components/PedidoForm";
import { db, auth } from "../firebase/firebase";
import PedidoTabla from "../components/PedidoTabla";
import ThemeSwitcher from "../components/ThemeSwitcher";


import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { format, startOfDay, endOfDay } from "date-fns";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function VendedorView() {
  const [usuario, setUsuario] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [cantidadPedidos, setCantidadPedidos] = useState(0);
  const [pedidos, setPedidos] = useState([]);
  const [pedidoAEditar, setPedidoAEditar] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login-vendedor");
      } else {
        setUsuario(user);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (usuario) {
      cargarCantidadPedidos(fechaSeleccionada);
      cargarPedidos(fechaSeleccionada);
    }
  }, [fechaSeleccionada, usuario]);

  const cargarCantidadPedidos = async (fecha) => {
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));
    const pedidosRef = collection(db, "pedidos");

    const q = query(
      pedidosRef,
      where("fecha", ">=", inicio),
      where("fecha", "<=", fin),
      where("vendedorEmail", "==", usuario?.email || "")
    );

    const querySnapshot = await getDocs(q);
    setCantidadPedidos(querySnapshot.docs.length);
  };

  const cargarPedidos = async (fecha) => {
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));
    const pedidosRef = collection(db, "pedidos");

    const q = query(
      pedidosRef,
      where("fecha", ">=", inicio),
      where("fecha", "<=", fin),
      where("vendedorEmail", "==", usuario?.email || "")
    );

    const querySnapshot = await getDocs(q);
    setPedidos(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const agregarPedido = async (pedido) => {
    const fechaAhora = new Date();
    await addDoc(collection(db, "pedidos"), {
      ...pedido,
      vendedorEmail: usuario?.email || "sin usuario",
      fecha: Timestamp.fromDate(fechaAhora),
      fechaStr: format(fechaAhora, "dd/MM/yyyy HH:mm"),
    });
    cargarCantidadPedidos(fechaSeleccionada);
    cargarPedidos(fechaSeleccionada);
  };

  const actualizarPedido = async (pedidoActualizado) => {
    const ref = doc(db, "pedidos", pedidoActualizado.id);
    await updateDoc(ref, pedidoActualizado);
    cargarPedidos(fechaSeleccionada);
    setPedidoAEditar(null);
  };

  const eliminarPedido = async (id) => {
    await deleteDoc(doc(db, "pedidos", id));
    cargarPedidos(fechaSeleccionada);
    cargarCantidadPedidos(fechaSeleccionada);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login-vendedor");
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content" data-theme="night">
      <div className="max-w-screen-xl px-4 py-6 mx-auto">
        <div className="flex flex-col items-center justify-between gap-4 mb-8 md:flex-row">
          <h2 className="text-2xl font-bold">🎨 Sistema de Pedidos - Pinturería</h2>
         <div className="flex gap-2">
  <ThemeSwitcher />
  <button className="btn btn-error" onClick={handleLogout}>
    Cerrar sesión
  </button>
</div>

        </div>

        <div className="mb-6">
          <label className="mr-2 font-semibold">📅 Ver cantidad de pedidos del día:</label>
          <DatePicker
            selected={fechaSeleccionada}
            onChange={(fecha) => setFechaSeleccionada(fecha)}
            className="text-black bg-white input input-bordered"
            dateFormat="dd/MM/yyyy"
          />
          <div className="mt-2">
            <strong>Pedidos cargados ese día:</strong> {cantidadPedidos}
          </div>
        </div>

        <div className="p-6 mb-6 border shadow bg-base-100 border-base-300 rounded-xl">
          <PedidoForm
            onAgregar={agregarPedido}
            onActualizar={actualizarPedido}
            pedidoAEditar={pedidoAEditar}
          />

          {pedidoAEditar && (
            <button
              className="w-full mt-4 btn btn-outline"
              onClick={() => setPedidoAEditar(null)}
            >
              ❌ Cancelar edición
            </button>
          )}
        </div>

        <div className="p-6 border shadow bg-base-100 border-base-300 rounded-xl">
          <h4 className="mb-4 text-lg font-semibold">📋 Tus pedidos del día</h4>
          <PedidoTabla
            pedidos={pedidos}
            onEditar={setPedidoAEditar}
            onEliminar={eliminarPedido}
          />
        </div>
      </div>
    </div>
  );
}

export default VendedorView;