// RepartidorView.js
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
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaMapMarkerAlt } from "react-icons/fa";
import RutaOptimizada from "../components/RutaOptimizada";
import ListaRutaPasoAPaso from "../components/ListaRutaPasoAPaso";
import BotonIniciarViaje from "../components/BotonIniciarViaje";

function RepartidorView() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [gastoExtra, setGastoExtra] = useState(0);
  const [campoAsignacion, setCampoAsignacion] = useState("");
  const [pedidosOrdenados, setPedidosOrdenados] = useState([]);
  const [viajeIniciado, setViajeIniciado] = useState(false);

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

    const fechaId = format(fecha, 'yyyy-MM-dd');
    const gastoDoc = await getDoc(doc(db, "gastosReparto", fechaId));
    setGastoExtra(gastoDoc.exists() ? gastoDoc.data().monto || 0 : 0);
  };

  useEffect(() => {
    const autorizado = localStorage.getItem("repartidorAutenticado");
    const email = localStorage.getItem("emailRepartidor");
    if (!autorizado || !email) return navigate("/login-repartidor");

    setCampoAsignacion(email);
    cargarPedidos(fechaSeleccionada, email);
  }, [fechaSeleccionada]);

  const marcarEntregado = async (id, entregado) => {
    await updateDoc(doc(db, "pedidos", id), { entregado });
    setPedidos(prev => prev.map(p => (p.id === id ? { ...p, entregado } : p)));
    setPedidosOrdenados(prev => prev.map(p => (p.id === id ? { ...p, entregado } : p)));
  };

  const actualizarMetodoPago = async (id, metodoPago) => {
    await updateDoc(doc(db, "pedidos", id), { metodoPago });
    setPedidos(prev => prev.map(p => (p.id === id ? { ...p, metodoPago } : p)));
    setPedidosOrdenados(prev => prev.map(p => (p.id === id ? { ...p, metodoPago } : p)));
  };

  const actualizarComprobante = async (id, comprobante) => {
    await updateDoc(doc(db, "pedidos", id), { comprobante });
    setPedidos(prev => prev.map(p => (p.id === id ? { ...p, comprobante } : p)));
  };

  const actualizarNotas = async (id, notas) => {
    await updateDoc(doc(db, "pedidos", id), { notasRepartidor: notas });
    setPedidos(prev => prev.map(p => (p.id === id ? { ...p, notasRepartidor: notas } : p)));
  };

  const actualizarGastoExtra = async (valor) => {
    const num = parseInt(valor) || 0;
    setGastoExtra(num);
    const fechaId = format(fechaSeleccionada, 'yyyy-MM-dd');
    await setDoc(doc(db, "gastosReparto", fechaId), { monto: num });
  };

  const totales = useMemo(() => {
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let totalTarjeta = 0;

    pedidos.forEach(p => {
      if (!p.entregado || typeof p.pedido !== "string") return;
      const match = p.pedido.match(/TOTAL: \$?(\d+)/);
      let monto = match ? parseInt(match[1]) : 0;
      if (p.metodoPago === "transferencia" || p.metodoPago === "tarjeta") monto *= 1.1;
      if (p.metodoPago === "transferencia") totalTransferencia += monto;
      else if (p.metodoPago === "tarjeta") totalTarjeta += monto;
      else if (p.metodoPago === "efectivo") totalEfectivo += monto;
    });

    const totalFinal = totalEfectivo + totalTransferencia + totalTarjeta - gastoExtra;
    return { totalEfectivo, totalTransferencia, totalTarjeta, totalFinal };
  }, [pedidos, gastoExtra]);

  const exportarEntregadosAExcel = () => {
    const entregados = [...pedidos]
      .filter(p => p.entregado)
      .sort((a, b) => (a.ordenRuta || 9999) - (b.ordenRuta || 9999));

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

    data.push({},
      { Nombre: "Total Efectivo", MontoCalculado: `$${totales.totalEfectivo.toLocaleString()}` },
      { Nombre: "Total Transferencia (+10%)", MontoCalculado: `$${totales.totalTransferencia.toLocaleString()}` },
      { Nombre: "Total Tarjeta (+10%)", MontoCalculado: `$${totales.totalTarjeta.toLocaleString()}` },
      { Nombre: "Gasto Extra", MontoCalculado: `-$${gastoExtra.toLocaleString()}` },
      { Nombre: "Total Neto Recaudado", MontoCalculado: `$${totales.totalFinal.toLocaleString()}` }
    );

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entregados");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `Entregados_${format(fechaSeleccionada, 'yyyy-MM-dd')}.xlsx`);
  };

  const instrucciones = JSON.parse(localStorage.getItem("instruccionesRuta") || "[]");

  return (
    <div className="min-h-screen p-4 bg-base-100 text-base-content">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="mb-4 text-2xl font-bold">🚚 Pedidos para Reparto</h2>

        <DatePicker selected={fechaSeleccionada} onChange={setFechaSeleccionada} className="input input-bordered" />

        <button className="my-4 btn btn-outline btn-info" onClick={() => {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            alert(`📍 Estás aquí:\nLat: ${lat}\nLng: ${lng}`);
          });
        }}>
          📌 Mostrar ubicación actual
        </button>

        {viajeIniciado && (
          <div className="mb-4 shadow-lg alert alert-success">
            🚀 El viaje ha comenzado
          </div>
        )}

        <div className="grid gap-4 mt-4 lg:grid-cols-3 md:grid-cols-2">
          {pedidosOrdenados.map((p, i) => (
            <div key={p.id} className="border-l-4 shadow-md card bg-base-200 border-primary">
              <div className="space-y-2 card-body">
                <h3 className="font-bold text-primary">📦 Pedido #{p.ordenRuta || i + 1}</h3>
                <p><b>👤 Nombre:</b> {p.nombre}</p>
                <p><b>📍 Dirección:</b> {p.direccion}{" "}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion)}`} target="_blank" rel="noreferrer">
                    <FaMapMarkerAlt className="inline text-red-500" />
                  </a>
                </p>
                <p><b>📱 Teléfono:</b> {p.telefono}</p>
                <p><b>📝 Pedido:</b> <span className="font-bold text-success">{p.pedido}</span></p>

                <button
                  className={`btn btn-sm w-full ${p.entregado ? "btn-success" : "btn-error"}`}
                  onClick={() => marcarEntregado(p.id, !p.entregado)}
                >
                  {p.entregado ? "✅ Entregado" : "🚫 No entregado"}
                </button>

                <a
                  href={`https://wa.me/${p.telefono}?text=Hola ${p.nombre}, tu pedido ya está en camino 🚚`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 btn btn-sm btn-info"
                >
                  📲 Avisar por WhatsApp
                </a>

                <div className="form-control">
                  <label className="label"><span className="label-text">💰 Método de pago</span></label>
                  <select className="select select-bordered" value={p.metodoPago || ""} onChange={(e) => actualizarMetodoPago(p.id, e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                {(p.metodoPago === "transferencia" || p.metodoPago === "tarjeta") && (
                  <input
                    type="text"
                    className="mt-2 input input-bordered"
                    placeholder="N° comprobante"
                    value={p.comprobante || ""}
                    onChange={(e) => actualizarComprobante(p.id, e.target.value)}
                  />
                )}

                <div className="form-control">
                  <label className="label"><span className="label-text">📝 Notas del repartidor</span></label>
                  <textarea
                    className="textarea textarea-bordered"
                    value={p.notasRepartidor || ""}
                    onChange={(e) => actualizarNotas(p.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="my-6 space-y-2">
          <h3 className="text-xl font-semibold">🧭 Instrucciones paso a paso</h3>
          <ul className="list-disc list-inside">
            {instrucciones.map((inst, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: inst }} />
            ))}
          </ul>
        </div>

        <div className="flex flex-col flex-wrap items-start justify-between mt-6 text-sm text-black alert bg-info md:flex-row gap-x-6 gap-y-1 md:items-center md:text-base">
  <p><b>✅ Entregados:</b> {pedidos.filter(p => p.entregado).length} / {pedidos.length}</p>
  <p><b>💵 Total efectivo:</b> ${totales.totalEfectivo.toLocaleString()}</p>
  <p><b>🏦 Transferencia (+10%):</b> ${totales.totalTransferencia.toLocaleString()}</p>
  <p><b>💳 Tarjeta (+10%):</b> ${totales.totalTarjeta.toLocaleString()}</p>
  <p><b>⛽ Gasto extra:</b> -${gastoExtra.toLocaleString()}</p>
  <p className="font-bold"><b>🤑 Total neto:</b> ${totales.totalFinal.toLocaleString()}</p>
</div>

        <div className="mt-4">
          <label className="font-semibold label-text">⛽ Gasto extra</label>
          <input
            type="number"
            className="w-40 input input-bordered"
            value={gastoExtra}
            onChange={(e) => actualizarGastoExtra(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="font-semibold label-text">💵 Monto adicional contado manualmente</label>
          <input
            type="number"
            className="w-40 input input-bordered"
            onBlur={(e) => {
              const monto = parseInt(e.target.value) || 0;
              alert(`💡 Recordá sumar manualmente $${monto.toLocaleString()} a tu recaudación`);
            }}
          />
        </div>

        <div className="mt-6">
          <h4 className="mb-2 text-xl font-semibold">🗺️ Ruta Optimizada</h4>
          <RutaOptimizada
            fecha={fechaSeleccionada}
            repartidorCampo={campoAsignacion}
            setListaOrdenada={setPedidosOrdenados}
          />
        </div>

        <ListaRutaPasoAPaso pedidosOrdenados={pedidosOrdenados} />
        <BotonIniciarViaje pedidos={pedidosOrdenados} onStart={() => setViajeIniciado(true)} />

        <div className="flex flex-wrap gap-2 mt-6">
          <button className="btn btn-success" onClick={exportarEntregadosAExcel}>
            📥 Exportar entregados a Excel
          </button>
          <button className="btn btn-outline btn-error" onClick={() => {
            localStorage.removeItem("repartidorAutenticado");
            localStorage.removeItem("emailRepartidor");
            navigate("/login-repartidor");
          }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default RepartidorView;
