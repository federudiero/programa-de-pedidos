import React, { useState } from "react";
import { collection, getDocs, updateDoc, doc, addDoc, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { startOfDay, endOfDay } from "date-fns";

function CierreCaja() {
  const [resumen, setResumen] = useState({});
  const [procesado, setProcesado] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPedidosDeHoy = async () => {
    const hoy = new Date();
    const inicio = startOfDay(hoy);
    const fin = endOfDay(hoy);
    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, where("fecha", ">=", inicio), where("fecha", "<=", fin));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  };

  const cerrarCaja = async () => {
    setLoading(true);
    const pedidos = await getPedidosDeHoy();
    const contador = {};

    pedidos.forEach(p => {
      (p.productos || []).forEach(prod => {
        if (!contador[prod.nombre]) contador[prod.nombre] = 0;
        contador[prod.nombre] += prod.cantidad;
      });
    });

    const productosSnap = await getDocs(collection(db, "productos"));
    for (const prodDoc of productosSnap.docs) {
      const data = prodDoc.data();
      const vendidos = contador[data.nombre] || 0;
      const nuevoStock = data.stock - vendidos;
      await updateDoc(doc(db, "productos", prodDoc.id), {
        stock: nuevoStock >= 0 ? nuevoStock : 0,
      });
    }

    await addDoc(collection(db, "cierres"), {
      fecha: new Date(),
      productosVendidos: contador,
    });

    setResumen(contador);
    setProcesado(true);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-bold">🧾 Cierre de Caja Diario</h2>
      <button className="mb-4 btn btn-primary" onClick={cerrarCaja} disabled={loading}>
        {loading ? "Procesando..." : "📦 Procesar Cierre"}
      </button>

      {procesado && (
        <div className="mt-4">
          <h3 className="mb-2 font-semibold">Productos descontados del stock:</h3>
          <ul className="pl-5 list-disc">
            {Object.entries(resumen).map(([nombre, cantidad]) => (
              <li key={nombre}>{nombre}: {cantidad} unidades</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CierreCaja;
