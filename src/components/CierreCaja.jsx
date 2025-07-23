import React, { useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { startOfDay, endOfDay, format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { auth } from "../firebase/firebase";
import { serverTimestamp } from "firebase/firestore";


const admins = [
  "federudiero@gmail.com",
  "admin2@mail.com",
  "admin3@mail.com",
  "franco.coronel.134@gmail.com",
  "agus.belen64@gmail.com"
];



function CierreCaja() {
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(new Date());
  const [resumen, setResumen] = useState({});
  const [procesado, setProcesado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faltanCierres, setFaltanCierres] = useState(false);

  const [resumenPorRepartidor, setResumenPorRepartidor] = useState({});
  const [detallePendientes, setDetallePendientes] = useState([]);

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

  const verificarCierres = async (repartidores, fechaStr, pedidos) => {
    const cierresSnap = await getDocs(collection(db, "cierresRepartidor"));
    const cierresDelDia = cierresSnap.docs.map((doc) => doc.id);

    const pendientes = repartidores.filter(
      (email) => !cierresDelDia.includes(`${email}_${fechaStr}`)
    );

    const detalle = pendientes.map((email) => {
      const cantidad = pedidos.filter(
        (p) =>
          Array.isArray(p.asignadoA) &&
          p.asignadoA.includes(email) &&
          p.entregado === true
      ).length;
      return { email, entregados: cantidad };
    });

    setDetallePendientes(detalle);
    return pendientes;
  };

  const cerrarCaja = async () => {
    setLoading(true);
    setFaltanCierres(false);
   
    setProcesado(false);

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

    const pedidos = await getPedidosDeDia(fecha);
    const repartidores = await getRepartidoresConPedidos(fecha);
    const pendientes = await verificarCierres(repartidores, fechaStr, pedidos);

    if (pendientes.length > 0) {
      setFaltanCierres(true);
    
      setLoading(false);
      return;
    }

    const resumenGlobal = {};
    const resumenPorR = {};

    pedidos.forEach((p) => {
      if (!Array.isArray(p.asignadoA)) return;
      const repartidor = p.asignadoA[0];
      if (!resumenPorR[repartidor]) resumenPorR[repartidor] = [];
      resumenPorR[repartidor].push(p);

      if (Array.isArray(p.productos)) {
        p.productos.forEach((prod) => {
          if (!resumenGlobal[prod.nombre]) resumenGlobal[prod.nombre] = 0;
          resumenGlobal[prod.nombre] += prod.cantidad;
        });
      } else if (typeof p.pedido === "string") {
        const partes = p.pedido.split(" - ");
        partes.forEach((parte) => {
          const match = parte.match(/^(.*?) x(\d+)/);
          if (match) {
            const nombre = match[1].trim();
            const cantidad = parseInt(match[2]);
            if (!resumenGlobal[nombre]) resumenGlobal[nombre] = 0;
            resumenGlobal[nombre] += cantidad;
          }
        });
      }
    });

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


const anularCierre = async () => {
  const user = auth.currentUser;
  if (!user || !admins.includes(user.email)) return;

  const fechaStr = format(fecha, "yyyy-MM-dd");
  const confirm = await Swal.fire({
    title: "¿Anular cierre?",
    text: `Esto restaurará el stock y eliminará el cierre del día ${fechaStr}.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, anular",
    cancelButtonText: "Cancelar",
  });

  if (!confirm.isConfirmed) return;

  setLoading(true);

  const cierreSnap = await getDocs(
    query(
      collection(db, "cierres"),
      where("fecha", ">=", startOfDay(fecha)),
      where("fecha", "<=", endOfDay(fecha))
    )
  );

  if (cierreSnap.empty) {
    Swal.fire("Error", "No se encontró un cierre para esta fecha.", "error");
    setLoading(false);
    return;
  }

  const cierreDoc = cierreSnap.docs[0];
  const cierreData = cierreDoc.data();
  const resumen = cierreData.productosVendidos || {};

  const productosSnap = await getDocs(collection(db, "productos"));
  for (const prodDoc of productosSnap.docs) {
    const data = prodDoc.data();
    const devueltos = resumen[data.nombre] || 0;
    await updateDoc(doc(db, "productos", prodDoc.id), {
      stock: data.stock + devueltos,
    });
  }

  // 🔁 Registrar anulación
  await addDoc(collection(db, "anulacionesCierre"), {
    tipo: "global",
    fecha,
    emailAdmin: user.email,
    productosRevertidos: resumen,
    timestamp: serverTimestamp(),
  });

  await cierreDoc.ref.delete();

  setResumen({});
  setResumenPorRepartidor({});
  setProcesado(false);
  Swal.fire("✅ Anulado", "El cierre ha sido revertido y registrado.", "success");
  setLoading(false);
};
  return (
    <div className="max-w-6xl min-h-screen px-4 py-6 mx-auto bg-base-100 text-base-content">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">🧾 Cierre de Caja Diario</h2>
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
        <div className="hidden gap-2 md:flex">
          <button className="btn btn-outline" onClick={() => navigate("/admin/stock")}>
            ⬅ Volver a AdminStock
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/admin/panel-stock")}>
            📊 Panel de Stock
          </button>
        </div>
      </div>

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

      {faltanCierres && (
        <div className="p-4 mb-6 text-red-200 bg-red-700 border border-red-300 rounded shadow">
          <p className="mb-2 text-lg font-semibold">⚠️ Faltan repartidores por cerrar su caja:</p>
          <ul className="space-y-1 list-disc list-inside">
            {detallePendientes.map((r) => (
              <li key={r.email}>
                <span className="font-semibold">{r.email}</span> – Pedidos entregados: {r.entregados}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-yellow-100">👉 Asegurate de que hayan finalizado su reparto.</p>
        </div>
      )}

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
{auth.currentUser && admins.includes(auth.currentUser.email) && (
  <button
    className="mt-4 ml-4 btn btn-outline btn-error"
    onClick={anularCierre}
    disabled={loading}
  >
    ❌ Anular cierre
  </button>
)}
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
                        const match =
                          typeof p.pedido === "string"
                            ? p.pedido.match(/TOTAL: \$?(\d+)/)
                            : null;
                        let monto = match ? parseInt(match[1]) : 0;
                        if (p.metodoPago === "transferencia" || p.metodoPago === "tarjeta")
                          monto *= 1.1;
                        return (
                          <tr key={p.id} className="hover:bg-gray-700">
                            <td>{p.nombre}</td>
                            <td>{p.direccion}</td>
                            <td>{p.telefono}</td>
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
