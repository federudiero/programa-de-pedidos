import React, { useState, useEffect } from "react";
import {
  collection, getDocs, updateDoc, doc, addDoc, query, where, deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { startOfDay, endOfDay, format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal from "sweetalert2";

const admins = [
  "federudiero@gmail.com",
  "admin2@mail.com",
  "admin3@mail.com",
  "franco.coronel.134@gmail.com",
  "agus.belen64@gmail.com"
];

function CierreCaja() {
  const [fecha, setFecha] = useState(new Date());
  const [resumen, setResumen] = useState({});
  const [procesado, setProcesado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cierreYaExistente, setCierreYaExistente] = useState(false);
  const [resumenPorRepartidor, setResumenPorRepartidor] = useState({});
  const [pedidosEntregados, setPedidosEntregados] = useState([]);

  const verificarEstado = async () => {
    setResumen({});
    setResumenPorRepartidor({});
    setProcesado(false);
    setCierreYaExistente(false);

    const fechaStr = format(fecha, "yyyy-MM-dd");
    const snap = await getDocs(query(collection(db, "cierres"), where("fechaStr", "==", fechaStr)));
    setCierreYaExistente(!snap.empty);

    const pedidosSnap = await getDocs(
      query(
        collection(db, "pedidos"),
        where("fecha", ">=", startOfDay(fecha)),
        where("fecha", "<=", endOfDay(fecha)),
        where("entregado", "==", true)
      )
    );
    setPedidosEntregados(pedidosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    verificarEstado();
  }, [fecha]);

  const cerrarCaja = async () => {
    setLoading(true);
    const fechaStr = format(fecha, "yyyy-MM-dd");

    const pedidosSnap = await getDocs(
      query(
        collection(db, "pedidos"),
        where("fecha", ">=", startOfDay(fecha)),
        where("fecha", "<=", endOfDay(fecha)),
        where("entregado", "==", true)
      )
    );
    const pedidos = pedidosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const resumenGlobal = {};
    const porRepartidor = {};

    for (const p of pedidos) {
      if (Array.isArray(p.asignadoA)) {
        const repartidor = p.asignadoA[0];
        if (!porRepartidor[repartidor]) porRepartidor[repartidor] = [];
        porRepartidor[repartidor].push(p);
      }

      if (Array.isArray(p.productos)) {
        for (const prod of p.productos) {
          if (!resumenGlobal[prod.nombre]) resumenGlobal[prod.nombre] = 0;
          resumenGlobal[prod.nombre] += prod.cantidad;
        }
      } else if (typeof p.pedido === "string") {
        const partes = p.pedido.split(" - ");
        for (const parte of partes) {
          const match = parte.match(/^(.*?) x(\d+)/);
          if (match) {
            const nombre = match[1].trim();
            const cantidad = parseInt(match[2]);
            if (!resumenGlobal[nombre]) resumenGlobal[nombre] = 0;
            resumenGlobal[nombre] += cantidad;
          }
        }
      }
    }

    if (Object.keys(resumenGlobal).length === 0) {
      Swal.fire("Sin ventas", "No se encontraron productos entregados", "warning");
      setLoading(false);
      return;
    }

    const productosSnap = await getDocs(collection(db, "productos"));
    for (const docProd of productosSnap.docs) {
      const data = docProd.data();
      const vendidos = resumenGlobal[data.nombre] || 0;
      const nuevoStock = data.stock - vendidos;
      await updateDoc(doc(db, "productos", docProd.id), {
        stock: nuevoStock >= 0 ? nuevoStock : 0,
      });
    }

    await addDoc(collection(db, "cierres"), {
      fecha,
      fechaStr,
      productosVendidos: resumenGlobal,
      detalleRepartidores: porRepartidor,
    });

    setResumen(resumenGlobal);
    setResumenPorRepartidor(porRepartidor);
    setProcesado(true);
    setLoading(false);
  };

const anularCierre = async () => {
  const confirm = await Swal.fire({
    title: "¿Anular cierre del día?",
    text: "Esto restaurará el stock y eliminará el cierre.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, anular"
  });
  if (!confirm.isConfirmed) return;

  setLoading(true);
  try {
    const fechaStr = format(fecha, "yyyy-MM-dd");
    const snap = await getDocs(query(collection(db, "cierres"), where("fechaStr", "==", fechaStr)));
    const docCierre = snap.docs[0];

    if (!docCierre) throw new Error("Cierre no encontrado");

    const data = docCierre.data();

    // Restaurar stock
    const productosSnap = await getDocs(collection(db, "productos"));
    for (const prod of productosSnap.docs) {
      const nombre = prod.data().nombre;
      const cantidad = data.productosVendidos[nombre] || 0;
      await updateDoc(prod.ref, {
        stock: prod.data().stock + cantidad
      });
    }

    // Eliminar el cierre
    await deleteDoc(docCierre.ref);

    // Registrar la anulación
    await addDoc(collection(db, "anulacionesCierre"), {
      tipo: "global",
      fecha,
      fechaStr,
      emailAdmin: auth.currentUser.email,
      productosRevertidos: data.productosVendidos,
      timestamp: new Date(),
    });

    Swal.fire("Anulado", "Cierre eliminado y stock restaurado", "success");

    // 🔧 Corrección: actualizar el estado del frontend
    setResumen({});
    setProcesado(false);
    setCierreYaExistente(false); // ← IMPORTANTE
  } catch (e) {
    console.error(e);
    Swal.fire("Error", "No se pudo anular", "error");
  }
  setLoading(false);
};


  const exportarExcel = () => {
    const data = Object.entries(resumen).map(([nombre, cantidad]) => ({
      Producto: nombre,
      CantidadDescontada: cantidad
    }));
    const hoja = XLSX.utils.json_to_sheet(data);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "CierreCaja");
    const fechaStr = format(fecha, "yyyy-MM-dd");
    const buffer = XLSX.write(libro, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `CierreCaja_${fechaStr}.xlsx`);
  };

  return (
    <div className="max-w-6xl min-h-screen px-4 py-6 mx-auto bg-base-100 text-base-content">
      <h2 className="mb-6 text-2xl font-bold">🧾 Cierre de Caja Diario</h2>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="font-semibold">📅 Fecha:</label>
        <DatePicker selected={fecha} onChange={setFecha} className="input input-bordered" />
        <button className="btn btn-info" onClick={verificarEstado} disabled={loading}>🔍 Consultar</button>
        <button className="btn btn-primary" onClick={cerrarCaja} disabled={loading || cierreYaExistente}>📦 Procesar Cierre</button>
      </div>

      {cierreYaExistente && (
        <div className="p-2 mb-4 text-yellow-100 bg-yellow-600 border border-yellow-300 rounded">
          ⚠️ Ya se realizó el cierre para esta fecha.
        </div>
      )}

      {cierreYaExistente && auth.currentUser && admins.includes(auth.currentUser.email) && (
        <div className="mb-4">
          <button className="btn btn-outline btn-error" onClick={anularCierre}>
            ❌ Anular cierre del día seleccionado
          </button>
        </div>
      )}

      {!procesado && pedidosEntregados.length > 0 && (
        <div className="p-4 mb-6 overflow-x-auto border rounded bg-base-200 border-info">
          <h3 className="mb-4 text-lg font-semibold text-info">📦 Pedidos entregados para la fecha</h3>
          <table className="table w-full table-sm table-zebra">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Repartidor</th>
                <th>Monto</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              {pedidosEntregados.map((p, i) => {
                let monto = 0;
                if (typeof p.pedido === "string") {
                  const match = p.pedido.match(/TOTAL: \$?(\d+)/);
                  monto = match ? parseInt(match[1]) : 0;
                  if (p.metodoPago === "transferencia" || p.metodoPago === "tarjeta") {
                    monto *= 1.1;
                  }
                }
                return (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.nombre}</td>
                    <td>{p.direccion}</td>
                    <td>{Array.isArray(p.asignadoA) ? p.asignadoA[0] : "-"}</td>
                    <td>${monto.toLocaleString()}</td>
                    <td>{p.metodoPago || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {procesado && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">📉 Productos descontados del stock</h3>
            <ul className="list-disc list-inside">
              {Object.entries(resumen).map(([nombre, cantidad]) => (
                <li key={nombre}>{nombre}: {cantidad} unidades</li>
              ))}
            </ul>
            <button className="mt-4 btn btn-outline btn-success" onClick={exportarExcel}>
              📥 Exportar a Excel
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold">📋 Pedidos entregados por repartidor</h3>
            {Object.entries(resumenPorRepartidor).map(([email, pedidos]) => (
              <div key={email} className="p-4 my-2 bg-gray-800 rounded">
                <h4 className="mb-2 font-bold text-white">🧑 {email}</h4>
                <ul className="text-white list-disc list-inside">
                  {pedidos.map(p => (
                    <li key={p.id}>{p.nombre} – {p.direccion}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CierreCaja;
