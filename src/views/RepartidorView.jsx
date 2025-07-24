// RepartidorView.jsx
import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase/firebase";
import {
  collection, getDocs, query, where,
  updateDoc, doc, Timestamp, setDoc, getDoc
} from "firebase/firestore";
import { startOfDay, endOfDay, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaMapMarkerAlt } from "react-icons/fa";
import RutaOptimizada from "../components/RutaOptimizada";
import ListaRutaPasoAPaso from "../components/ListaRutaPasoAPaso";
import BotonIniciarViaje from "../components/BotonIniciarViaje";
import { BASE_COORDENADAS } from "../config.jsx";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function RepartidorView() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [gastoExtra, setGastoExtra] = useState(0);
  const [viajeIniciado, setViajeIniciado] = useState(false);
  const [pedidosOrdenados, setPedidosOrdenados] = useState([]);
  const [bloqueado, setBloqueado] = useState(false);

  const email = localStorage.getItem("emailRepartidor");

  const verificarCierre = async (fecha) => {
    const fechaStr = format(fecha, "yyyy-MM-dd");
    const snap = await getDocs(query(collection(db, "cierres"), where("fechaStr", "==", fechaStr)));
    setBloqueado(!snap.empty);
  };

  const cargarPedidos = async (fecha, email) => {
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));
    const q = query(
      collection(db, "pedidos"),
      where("fecha", ">=", inicio),
      where("fecha", "<=", fin),
      where("asignadoA", "array-contains", email)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPedidos(data);
    setPedidosOrdenados(data.sort((a, b) => (a.ordenRuta || 9999) - (b.ordenRuta || 9999)));

    const fechaId = format(fecha, 'yyyy-MM-dd');
    const gastoDoc = await getDoc(doc(db, "gastosReparto", fechaId));
    setGastoExtra(gastoDoc.exists() ? gastoDoc.data().monto || 0 : 0);
  };

 useEffect(() => {
  const autorizado = localStorage.getItem("repartidorAutenticado");
  if (!autorizado || !email) return navigate("/login-repartidor");

  const init = async () => {
    await verificarCierre(fechaSeleccionada);
    await cargarPedidos(fechaSeleccionada, email);
  };

  init();
}, [fechaSeleccionada]);


  const actualizarEstadoPedido = (id, cambios) => {
    setPedidos(prev => prev.map(p => (p.id === id ? { ...p, ...cambios } : p)));
    setPedidosOrdenados(prev => prev.map(p => (p.id === id ? { ...p, ...cambios } : p)));
  };

  const marcarEntregado = async (id, entregado) => {
    if (bloqueado) return;
    await updateDoc(doc(db, "pedidos", id), { entregado });
    actualizarEstadoPedido(id, { entregado });
  };

  const actualizarMetodoPago = async (id, metodoPago) => {
    if (bloqueado) return;
    await updateDoc(doc(db, "pedidos", id), { metodoPago });
    actualizarEstadoPedido(id, { metodoPago });
  };

  const actualizarComprobante = async (id, comprobante) => {
    if (bloqueado) return;
    await updateDoc(doc(db, "pedidos", id), { comprobante });
    actualizarEstadoPedido(id, { comprobante });
  };

  const actualizarNotas = async (id, notas) => {
    if (bloqueado) return;
    await updateDoc(doc(db, "pedidos", id), { notasRepartidor: notas });
    actualizarEstadoPedido(id, { notasRepartidor: notas });
  };

  const actualizarGastoExtra = async (valor) => {
    if (bloqueado) return;
    const num = parseInt(valor) || 0;
    setGastoExtra(num);
    const fechaId = format(fechaSeleccionada, 'yyyy-MM-dd');
    await setDoc(doc(db, "gastosReparto", fechaId), { monto: num });
  };

  const totales = useMemo(() => {
    let totalEfectivo = 0, totalTransferencia = 0, totalTarjeta = 0;
    pedidos.forEach(p => {
      if (!p.entregado || typeof p.pedido !== "string") return;
      const match = p.pedido.match(/TOTAL: \$?(\d+)/);
      let monto = match ? parseInt(match[1]) : 0;
      if (p.metodoPago === "transferencia" || p.metodoPago === "tarjeta") monto *= 1.1;
      if (p.metodoPago === "transferencia") totalTransferencia += monto;
      else if (p.metodoPago === "tarjeta") totalTarjeta += monto;
      else totalEfectivo += monto;
    });
    return {
      totalEfectivo,
      totalTransferencia,
      totalTarjeta,
      totalFinal: totalEfectivo + totalTransferencia + totalTarjeta - gastoExtra,
    };
  }, [pedidos, gastoExtra]);

  const exportarEntregadosAExcel = () => {
    const entregados = pedidosOrdenados.filter(p => p.entregado);
    const data = entregados.map(p => {
      const match = typeof p.pedido === "string" ? p.pedido.match(/TOTAL: \$?(\d+)/) : null;
      let monto = match ? parseInt(match[1]) : 0;
      if (p.metodoPago === "transferencia" || p.metodoPago === "tarjeta") monto *= 1.1;
      return {
        Orden: p.ordenRuta,
        Nombre: p.nombre,
        Direccion: p.direccion,
        Telefono: p.telefono,
        Pedido: p.pedido,
        Fecha: p.fechaStr || "",
        MetodoPago: p.metodoPago || "",
        Comprobante: p.comprobante || "",
        MontoCalculado: `$${monto.toLocaleString()}`
      };
    });
    const resumen = [
      {},
      { Nombre: "Total Efectivo", MontoCalculado: `$${totales.totalEfectivo.toLocaleString()}` },
      { Nombre: "Transferencia (+10%)", MontoCalculado: `$${totales.totalTransferencia.toLocaleString()}` },
      { Nombre: "Tarjeta (+10%)", MontoCalculado: `$${totales.totalTarjeta.toLocaleString()}` },
      { Nombre: "Gasto Extra", MontoCalculado: `-$${gastoExtra.toLocaleString()}` },
      { Nombre: "Total Neto", MontoCalculado: `$${totales.totalFinal.toLocaleString()}` }
    ];
    const worksheet = XLSX.utils.json_to_sheet([...data, ...resumen]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entregados");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer]), `Entregados_${format(fechaSeleccionada, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="min-h-screen p-4 bg-base-100 text-base-content">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="mb-4 text-2xl font-bold">🚚 Pedidos para Reparto</h2>

        <DatePicker selected={fechaSeleccionada} onChange={setFechaSeleccionada} className="input input-bordered" />

        {viajeIniciado && (
          <div className="my-4 alert alert-success">
            🚀 El viaje ha sido iniciado.
          </div>
        )}

        {bloqueado && (
          <div className="my-4 text-yellow-100 bg-yellow-600 border border-yellow-300 alert">
            🛑 El cierre de caja ya fue realizado. No se pueden modificar los pedidos.
          </div>
        )}

        <div className="grid gap-4 mt-4 lg:grid-cols-3 md:grid-cols-2">
          {pedidosOrdenados.map((p, i) => (
            <div key={p.id} className="transition border-l-4 shadow-md card bg-base-200 border-primary animate-fade-in-up rounded-xl">
              <div className="space-y-2 card-body">
                <h3 className="font-bold text-primary">📦 Pedido #{p.ordenRuta || i + 1}</h3>
                <p><b>👤 Nombre:</b> {p.nombre}</p>
                <p><b>📍 Dirección:</b> {p.direccion}{" "}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}`} target="_blank" rel="noreferrer">
                    <FaMapMarkerAlt className="inline text-error" />
                  </a>
                </p>
                <p><b>📱 Teléfono:</b> {p.telefono}</p>
                <p><b>📝 Pedido:</b> <span className="font-bold text-success">{p.pedido}</span></p>

               <button
  className={`btn btn-sm w-full ${
    bloqueado
      ? "btn-disabled bg-gray-500 text-white cursor-not-allowed"
      : p.entregado
      ? "btn-success"
      : "btn-error"
  }`}
  onClick={() => marcarEntregado(p.id, !p.entregado)}
  disabled={bloqueado}
>
  {p.entregado ? "✅ Entregado" : "🚫 No entregado"}
</button>


                <a href={`https://wa.me/${p.telefono}?text=Hola ${p.nombre}, tu pedido ya está en camino 🚚`} target="_blank" rel="noopener noreferrer" className="mt-2 btn btn-sm btn-info">
                  📲 Avisar por WhatsApp
                </a>

                <div className="form-control">
                  <label className="label"><span className="label-text">💰 Método de pago</span></label>
                  <select className="select select-bordered" value={p.metodoPago || ""} onChange={(e) => actualizarMetodoPago(p.id, e.target.value)} disabled={bloqueado}>
                    <option value="">Seleccionar</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                {(p.metodoPago === "transferencia" || p.metodoPago === "tarjeta") && (
                  <input type="text" className="mt-2 input input-bordered" placeholder="N° comprobante" value={p.comprobante || ""} onChange={(e) => actualizarComprobante(p.id, e.target.value)} disabled={bloqueado} />
                )}

                <div className="mt-2 form-control">
                  <label className="label"><span className="label-text">📝 Notas del repartidor</span></label>
                  <textarea className="textarea textarea-bordered" value={p.notasRepartidor || ""} onChange={(e) => actualizarNotas(p.id, e.target.value)} disabled={bloqueado} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="font-semibold label-text">⛽ Gasto extra</label>
          <input type="number" className="w-40 input input-bordered" value={gastoExtra} onChange={(e) => actualizarGastoExtra(e.target.value)} disabled={bloqueado} />
        </div>

        <div className="p-4 mt-6 shadow-md bg-base-200 rounded-xl">
          <h3 className="mb-2 text-xl font-bold">🧾 Resumen de Rendición</h3>
          <ul className="space-y-1">
            <li>💵 Total en efectivo: <b>${totales.totalEfectivo.toLocaleString()}</b></li>
            <li>🏦 Transferencia (+10%): <b>${totales.totalTransferencia.toLocaleString()}</b></li>
            <li>💳 Tarjeta (+10%): <b>${totales.totalTarjeta.toLocaleString()}</b></li>
            <li>⛽ Gasto extra: <b className="text-error">-${gastoExtra.toLocaleString()}</b></li>
            <li className="mt-2 text-lg font-bold">💰 Total a rendir: <span className="text-success">${totales.totalFinal.toLocaleString()}</span></li>
          </ul>
        </div>

        <RutaOptimizada
          origin={BASE_COORDENADAS}
          destination={BASE_COORDENADAS}
          waypoints={pedidosOrdenados}
          onOrdenOptimizado={(orden) => {
            if (bloqueado) return;
            pedidosOrdenados.forEach((pedido, indexOriginal) => {
              const nuevoIndex = orden.indexOf(indexOriginal);
              if (nuevoIndex !== -1) {
                updateDoc(doc(db, "pedidos", pedido.id), {
                  ordenRuta: nuevoIndex + 1,
                });
              }
            });
          }}
        />

        <ListaRutaPasoAPaso pedidosOrdenados={pedidosOrdenados} />
        <BotonIniciarViaje pedidos={pedidosOrdenados} onStart={() => setViajeIniciado(true)} />

        <div className="mt-6">
          <button className="btn btn-success" onClick={exportarEntregadosAExcel}>📥 Exportar entregados a Excel</button>
          <button className="ml-2 btn btn-outline btn-error" onClick={() => {
            localStorage.removeItem("repartidorAutenticado");
            localStorage.removeItem("emailRepartidor");
            navigate("/login-repartidor");
          }}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

export default RepartidorView;
