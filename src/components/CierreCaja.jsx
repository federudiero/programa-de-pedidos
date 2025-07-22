import React, { useState } from "react";
import {
  collection, getDocs, updateDoc, doc, addDoc, query, where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { startOfDay, endOfDay, format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";

function CierreCaja() {
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(new Date());
  const [resumen, setResumen] = useState({});
  const [procesado, setProcesado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faltanCierres, setFaltanCierres] = useState(false);
  const [repartidoresFaltantes, setRepartidoresFaltantes] = useState([]);
  const [resumenPorRepartidor, setResumenPorRepartidor] = useState({});

  const getPedidosDeDia = async (dia) => {
    const inicio = startOfDay(dia);
    const fin = endOfDay(dia);
    const q = query(
      collection(db, "pedidos"),
      where("fecha", ">=", inicio),
      where("fecha", "<=", fin),
      where("entregado", "==", true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  const getRepartidoresConPedidos = async (dia) => {
    const pedidos = await getPedidosDeDia(dia);
    const repartidoresSet = new Set();
    pedidos.forEach((p) => {
      if (Array.isArray(p.asignadoA)) {
        p.asignadoA.forEach((email) => repartidoresSet.add(email));
      }
    });
    return Array.from(repartidoresSet);
  };

  const verificarCierres = async (repartidores, fechaStr) => {
    const cierresSnap = await getDocs(collection(db, "cierresRepartidor"));
    const cierresDelDia = cierresSnap.docs
      .filter((doc) => doc.id.endsWith(`_${fechaStr}`))
      .map((doc) => doc.data().repartidor);
    return repartidores.filter((email) => !cierresDelDia.includes(email));
  };

 const cerrarCaja = async () => {
  setLoading(true);
  setFaltanCierres(false);
  setRepartidoresFaltantes([]);

  const fechaStr = format(fecha, "yyyy-MM-dd");

  const cierreExistenteSnap = await getDocs(
    query(
      collection(db, "cierres"),
      where("fecha", ">=", startOfDay(fecha)),
      where("fecha", "<=", endOfDay(fecha))
    )
  );

  if (!cierreExistenteSnap.empty) {
    const docExistente = cierreExistenteSnap.docs[0];
    const data = docExistente.data();
    setResumen(data.productosVendidos || {});
    setResumenPorRepartidor(data.detalleRepartidores || {});
    setProcesado(true);
    alert("⚠️ Ya se realizó el cierre global para esta fecha.");
    setLoading(false);
    return;
  }

  const repartidores = await getRepartidoresConPedidos(fecha);
  const pendientes = await verificarCierres(repartidores, fechaStr);

  if (pendientes.length > 0) {
    setFaltanCierres(true);
    setRepartidoresFaltantes(pendientes);
    setLoading(false);
    return;
  }

  const pedidos = await getPedidosDeDia(fecha);
  console.log("📦 Pedidos del día:", pedidos);

  const resumenGlobal = {};
  const resumenPorR = {};

  pedidos.forEach((p) => {
  if (!Array.isArray(p.asignadoA)) return;
  const repartidor = p.asignadoA[0];
  if (!resumenPorR[repartidor]) resumenPorR[repartidor] = [];
  resumenPorR[repartidor].push(p);

  // 🔍 Preferimos array productos si existe
  if (Array.isArray(p.productos) && p.productos.length > 0) {
    p.productos.forEach((prod) => {
      if (!resumenGlobal[prod.nombre]) resumenGlobal[prod.nombre] = 0;
      resumenGlobal[prod.nombre] += prod.cantidad;
    });
  }

  // 🔄 Fallback: intentar extraer productos del string p.pedido
  else if (typeof p.pedido === "string") {
    const partes = p.pedido.split(" - ");
    partes.forEach((parte) => {
      const match = parte.match(/^(.*?) x(\d+)/); // ej: "LÁTEX BLANCO 20L x2"
      if (match) {
        const nombre = match[1].trim();
        const cantidad = parseInt(match[2]);
        if (!resumenGlobal[nombre]) resumenGlobal[nombre] = 0;
        resumenGlobal[nombre] += cantidad;
      }
    });
  }
});


  console.log("🧾 Resumen global:", resumenGlobal);
  console.log("🧾 Resumen por repartidor:", resumenPorR);

  // Validación extra
  if (Object.keys(resumenGlobal).length === 0) {
    alert("⚠️ No se encontraron productos vendidos. No se guardará el cierre.");
    setLoading(false);
    return;
  }

  const productosSnap = await getDocs(collection(db, "productos"));
  for (const prodDoc of productosSnap.docs) {
    const data = prodDoc.data();
    const vendidos = resumenGlobal[data.nombre] || 0;
    const nuevoStock = data.stock - vendidos;
    await updateDoc(doc(db, "productos", prodDoc.id), {
      stock: nuevoStock >= 0 ? nuevoStock : 0,
    });
  }

  // ⬇️ Guardamos todo
  await addDoc(collection(db, "cierres"), {
    fecha,
    fechaStr,
    productosVendidos: resumenGlobal,
    detalleRepartidores: resumenPorR,
  });

  setResumen(resumenGlobal);
  setResumenPorRepartidor(resumenPorR);
  setProcesado(true);
  setLoading(false);
};

  const exportarExcel = () => {
    const data = Object.entries(resumen).map(([nombre, cantidad]) => ({
      Producto: nombre,
      CantidadDescontada: cantidad,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CierreCaja");
    const fechaStr = format(fecha, "yyyy-MM-dd");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `CierreCaja_${fechaStr}.xlsx`);
  };

  return (
    <div className="max-w-6xl min-h-screen px-4 py-6 mx-auto bg-base-100 text-base-content">
      {/* ENCABEZADO y NAVBAR */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">🧾 Cierre de Caja Diario</h2>

        {/* Dropdown menú responsive */}
        <div className="dropdown dropdown-end md:hidden">
          <button tabIndex={0} className="btn btn-outline">☰ Menú</button>
          <ul
            tabIndex={0}
            className="z-10 p-2 shadow dropdown-content menu bg-base-200 rounded-box w-52"
          >
            <li>
              <button onClick={() => navigate("/admin/stock")}>⬅ Volver a AdminStock</button>
            </li>
            <li>
              <button onClick={() => navigate("/admin/panel-stock")}>📊 Panel de Stock</button>
            </li>
          </ul>
        </div>

        {/* Botones normales en escritorio */}
        <div className="hidden gap-2 md:flex">
          <button className="btn btn-outline" onClick={() => navigate("/admin/stock")}>
            ⬅ Volver a AdminStock
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/admin/panel-stock")}>
            📊 Panel de Stock
          </button>
        </div>
      </div>

      {/* Fecha y Procesar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="font-semibold">📅 Fecha:</label>
        <DatePicker
          selected={fecha}
          onChange={(date) => setFecha(date)}
          className="input input-bordered"
        />
        <button className="btn btn-primary" onClick={cerrarCaja} disabled={loading}>
          {loading ? "Procesando..." : "📦 Procesar Cierre"}
        </button>
      </div>

      {/* Advertencia si faltan repartidores */}
      {faltanCierres && (
        <div className="p-4 mb-6 text-red-200 bg-red-700 border border-red-300 rounded shadow">
          <p className="font-semibold">⚠️ Faltan repartidores por cerrar:</p>
          <ul className="mt-2 list-disc list-inside">
            {repartidoresFaltantes.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Resumen luego de procesar */}
      {procesado && (
        <div className="space-y-8">
          <div>
            <h3 className="mb-3 text-xl font-semibold">📉 Productos descontados del stock:</h3>
            <ul className="list-disc list-inside">
              {Object.entries(resumen).map(([nombre, cantidad]) => (
                <li key={nombre}>
                  {nombre}: {cantidad} unidades
                </li>
              ))}
            </ul>
            <button className="mt-4 btn btn-outline btn-success" onClick={exportarExcel}>
              📥 Exportar resumen a Excel
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-xl font-semibold">📋 Pedidos entregados por repartidor</h3>
            {Object.entries(resumenPorRepartidor).map(([repartidor, pedidos]) => (
              <div key={repartidor} className="p-4 mb-8 bg-gray-800 rounded shadow">
                <h4 className="mb-2 font-bold text-white">🧑 {repartidor}</h4>
                <div className="overflow-x-auto">
                  <table className="table w-full text-sm text-white">
                    <thead>
                      <tr className="bg-gray-700">
                        <th>Cliente</th>
                        <th>Dirección</th>
                        <th>Teléfono</th>
                        <th>Método de pago</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidos.map((p) => {
                        const match = typeof p.pedido === "string" ? p.pedido.match(/TOTAL: \$?(\d+)/) : null;
                        let monto = match ? parseInt(match[1]) : 0;
                        if (p.metodoPago === "transferencia" || p.metodoPago === "tarjeta") monto *= 1.1;
                        return (
                          <tr key={p.id} className="hover:bg-gray-700">
                            <td>{p.nombre}</td>
                            <td>{p.direccion}</td>
                            <td>{p.telefono}</td>
                            <td>{p.pedido}</td>
                            <td>{p.metodoPago || "-"}</td>
                            <td>${monto.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CierreCaja;
