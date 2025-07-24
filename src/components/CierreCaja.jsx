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
  const [pedidosNoEntregados, setPedidosNoEntregados] = useState([]);

  const verificarEstado = async (mostrarAlerta = false) => {
    setResumen({});
    setResumenPorRepartidor({});
    setProcesado(false);
    setCierreYaExistente(false);

    const fechaStr = format(fecha, "yyyy-MM-dd");
    const snap = await getDocs(query(collection(db, "cierres"), where("fechaStr", "==", fechaStr)));
    const cierreExiste = !snap.empty;
    setCierreYaExistente(cierreExiste);
    setProcesado(cierreExiste);

    const pedidosSnap = await getDocs(
      query(
        collection(db, "pedidos"),
        where("fecha", ">=", startOfDay(fecha)),
        where("fecha", "<=", endOfDay(fecha))
      )
    );

    const todos = pedidosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const entregados = todos.filter(p => p.entregado);
    const noEntregados = todos.filter(p => !p.entregado);
    setPedidosEntregados(entregados);
    setPedidosNoEntregados(noEntregados);

    const resumenGlobal = {};
    const porRepartidor = {};

    for (const p of entregados) {
      const asignado = Array.isArray(p.asignadoA) ? p.asignadoA[0] : "undefined";
      if (!porRepartidor[asignado]) porRepartidor[asignado] = [];
      porRepartidor[asignado].push(p);

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

    setResumen(resumenGlobal);
    setResumenPorRepartidor(porRepartidor);

    if (mostrarAlerta && !cierreExiste) {
      Swal.fire({
        title: "Cierre no realizado",
        text: "Todavía no se ha cerrado la caja para esta fecha.",
        icon: "info",
        confirmButtonText: "Entendido",
        customClass: { confirmButton: "btn btn-info text-white" },
        buttonsStyling: false
      });
    }
  };

  useEffect(() => {
    verificarEstado(false);
  }, [fecha]);

  const cerrarCaja = async () => {
    setLoading(true);
    const fechaStr = format(fecha, "yyyy-MM-dd");

    const pedidosSnap = await getDocs(
      query(
        collection(db, "pedidos"),
        where("fecha", ">=", startOfDay(fecha)),
        where("fecha", "<=", endOfDay(fecha))
      )
    );
    const todos = pedidosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const entregados = todos.filter(p => p.entregado);

    const resumenGlobal = {};
    const porRepartidor = {};

    for (const p of entregados) {
      const asignado = Array.isArray(p.asignadoA) ? p.asignadoA[0] : "undefined";
      if (!porRepartidor[asignado]) porRepartidor[asignado] = [];
      porRepartidor[asignado].push(p);

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
      const productosSnap = await getDocs(collection(db, "productos"));
      for (const prod of productosSnap.docs) {
        const nombre = prod.data().nombre;
        const cantidad = data.productosVendidos[nombre] || 0;
        await updateDoc(prod.ref, { stock: prod.data().stock + cantidad });
      }

      await deleteDoc(docCierre.ref);

      await addDoc(collection(db, "anulacionesCierre"), {
        tipo: "global",
        fecha,
        fechaStr,
        emailAdmin: auth.currentUser.email,
        productosRevertidos: data.productosVendidos,
        timestamp: new Date(),
      });

      Swal.fire("Anulado", "Cierre eliminado y stock restaurado", "success");

      setResumen({});
      setProcesado(false);
      setCierreYaExistente(false);
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
        <button className="btn btn-info" onClick={() => verificarEstado(true)} disabled={loading}>🔍 Consultar</button>
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
              <tr><th>#</th><th>Nombre</th><th>Dirección</th><th>Repartidor</th><th>Monto</th><th>Método</th></tr>
            </thead>
            <tbody>
              {pedidosEntregados.map((p, i) => {
                let monto = 0;
                if (typeof p.pedido === "string") {
                  const match = p.pedido.match(/TOTAL: \$?(\d+)/);
                  monto = match ? parseInt(match[1]) : 0;
                  if (["transferencia", "tarjeta"].includes(p.metodoPago)) monto *= 1.1;
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

      {!procesado && pedidosNoEntregados.length > 0 && (
        <div className="p-4 mb-6 overflow-x-auto border rounded bg-base-200 border-error">
          <h3 className="mb-4 text-lg font-semibold text-error">❗ Pedidos NO entregados</h3>
          <table className="table w-full table-sm table-zebra">
            <thead>
              <tr><th>#</th><th>Nombre</th><th>Dirección</th><th>Repartidor</th><th>Pedido</th><th>Método</th></tr>
            </thead>
            <tbody>
              {pedidosNoEntregados.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.nombre}</td>
                  <td>{p.direccion}</td>
                  <td>{Array.isArray(p.asignadoA) ? p.asignadoA[0] : "-"}</td>
                  <td>{typeof p.pedido === "string" ? p.pedido.slice(0, 30) + "..." : "-"}</td>
                  <td>{p.metodoPago || "-"}</td>
                </tr>
              ))}
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

          <div className="p-4 mb-6 overflow-x-auto border rounded bg-base-200 border-secondary">
            <h3 className="mb-4 text-lg font-semibold text-secondary">📋 Pedidos entregados por repartidor</h3>
            {Object.entries(resumenPorRepartidor).map(([email, pedidos]) => (
              <div key={email} className="mb-6">
                <h4 className="mb-2 text-base font-bold text-secondary-content">🧑 {email}</h4>
                <table className="table w-full table-sm table-zebra">
                  <thead>
                    <tr><th>#</th><th>Cliente</th><th>Dirección</th><th>Pedido</th><th>Monto</th><th>Método</th></tr>
                  </thead>
                  <tbody>
                    {pedidos.map((p, i) => {
                      let monto = 0;
                      if (typeof p.pedido === "string") {
                        const match = p.pedido.match(/TOTAL: \$?(\d+)/);
                        monto = match ? parseInt(match[1]) : 0;
                        if (["transferencia", "tarjeta"].includes(p.metodoPago)) monto *= 1.1;
                      }
                      return (
                        <tr key={p.id}>
                          <td>{i + 1}</td>
                          <td>{p.nombre}</td>
                          <td>{p.direccion}</td>
                          <td>{typeof p.pedido === "string" ? p.pedido.slice(0, 30) + "..." : "-"}</td>
                          <td>${monto.toLocaleString()}</td>
                          <td>{p.metodoPago || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CierreCaja;
