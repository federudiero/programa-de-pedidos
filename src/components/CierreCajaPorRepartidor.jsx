import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
  collection, getDocs, query, where, updateDoc, doc, addDoc
} from "firebase/firestore";
import { startOfDay, endOfDay } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const repartidores = [
  { label: "R1", email: "repartidor1@gmail.com" },
  { label: "R2", email: "repartidor2@gmail.com" },
  { label: "R3", email: "repartidor3@gmail.com" },
  { label: "R4", email: "repartidor4@gmail.com" },
];

function CierreCajaPorRepartidor() {
  const [fecha, setFecha] = useState(new Date());
  const [pedidosPorRepartidor, setPedidosPorRepartidor] = useState({});
  const [resumenCierre, setResumenCierre] = useState({});
  const [procesando, setProcesando] = useState(false);

  const cargarPedidos = async () => {
    const inicio = startOfDay(fecha);
    const fin = endOfDay(fecha);

    const q = query(
      collection(db, "pedidos"),
      where("fecha", ">=", inicio),
      where("fecha", "<=", fin)
    );
    const snapshot = await getDocs(q);
    const pedidos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const agrupado = {};
    repartidores.forEach(r => {
      agrupado[r.email] = pedidos.filter(p => (p.asignadoA || []).includes(r.email));
    });

    setPedidosPorRepartidor(agrupado);
  };

  useEffect(() => {
    cargarPedidos();
  }, [fecha]);

  const cerrarCajaRepartidor = async (email) => {
    setProcesando(true);

    const pedidos = pedidosPorRepartidor[email];
    const contador = {};

   pedidos.forEach(p => {
    if (!Array.isArray(p.entregados)) return;
    p.entregados.forEach(prod => {
      if (!contador[prod.nombre]) contador[prod.nombre] = 0;
      contador[prod.nombre] += prod.cantidad;
    });
  });


    // Actualizar stock
    const productosSnap = await getDocs(collection(db, "productos"));
    for (const prodDoc of productosSnap.docs) {
      const data = prodDoc.data();
      const vendidos = contador[data.nombre] || 0;
      const nuevoStock = data.stock - vendidos;
      await updateDoc(doc(db, "productos", prodDoc.id), {
        stock: nuevoStock >= 0 ? nuevoStock : 0,
      });
    }

    // Registrar cierre
    await addDoc(collection(db, "cierresPorRepartidor"), {
      fecha: new Date(),
      repartidor: email,
      productosVendidos: contador,
    });

    setResumenCierre(prev => ({ ...prev, [email]: contador }));
    setProcesando(false);
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">📦 Cierre de Caja por Repartidor</h2>

      <div className="mb-4">
        <label className="block font-semibold">📅 Seleccionar fecha:</label>
        <DatePicker
          selected={fecha}
          onChange={(date) => setFecha(date)}
          className="w-full max-w-xs input input-bordered"
        />
      </div>

      {repartidores.map(({ label, email }) => (
        <div key={email} className="p-4 mb-6 border rounded bg-base-200">
          <h3 className="mb-2 text-lg font-semibold">🧑 {label} - {email}</h3>
          <p>Pedidos asignados: {pedidosPorRepartidor[email]?.length || 0}</p>
          <button
            className="mt-2 btn btn-success"
            onClick={() => cerrarCajaRepartidor(email)}
            disabled={procesando}
          >
            {procesando ? "Procesando..." : "Cerrar caja"}
          </button>

          {resumenCierre[email] && (
            <ul className="pl-5 mt-4 list-disc">
              {Object.entries(resumenCierre[email]).map(([nombre, cant]) => (
                <li key={nombre}>{nombre}: {cant} unidades descontadas</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default CierreCajaPorRepartidor;
