import React, { useState, useEffect } from "react";
import { db, auth ,format } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  
} from "firebase/firestore";
import { startOfDay, endOfDay } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal from "sweetalert2";
import { serverTimestamp } from "firebase/firestore";
// ✅ CORRECTO


const repartidores = [
  { label: "R1", email: "repartidor1@gmail.com" },
  { label: "R2", email: "repartidor2@gmail.com" },
  { label: "R3", email: "repartidor3@gmail.com" },
  { label: "R4", email: "repartidor4@gmail.com" },
];

const admins = [
  "federudiero@gmail.com",
  "admin2@mail.com",
  "admin3@mail.com",
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
    const pedidos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const agrupado = {};
    repartidores.forEach((r) => {
      agrupado[r.email] = pedidos.filter((p) =>
        (p.asignadoA || []).includes(r.email)
      );
    });

    setPedidosPorRepartidor(agrupado);
  };

  useEffect(() => {
    cargarPedidos();
    cargarCierresPrevios();
  }, [fecha]);

  const cargarCierresPrevios = async () => {
    const inicio = startOfDay(fecha);
    const fin = endOfDay(fecha);
    const snap = await getDocs(
      query(
        collection(db, "cierresPorRepartidor"),
        where("fecha", ">=", inicio),
        where("fecha", "<=", fin)
      )
    );
    const resumen = {};
    snap.forEach((doc) => {
      const data = doc.data();
      resumen[data.repartidor] = data.productosVendidos;
    });
    setResumenCierre(resumen);
  };

  const cerrarCajaRepartidor = async (email) => {
    setProcesando(true);
    const pedidos = pedidosPorRepartidor[email];
    const contador = {};

    pedidos.forEach((p) => {
      if (!Array.isArray(p.entregados)) return;
      p.entregados.forEach((prod) => {
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

    await addDoc(collection(db, "cierresPorRepartidor"), {
      fecha: new Date(),
      repartidor: email,
      productosVendidos: contador,
    });

    setResumenCierre((prev) => ({ ...prev, [email]: contador }));
    setProcesando(false);
  };

 const anularCierreRepartidor = async (email) => {
  const user = auth.currentUser;
  if (!user || !admins.includes(user.email)) return;

  const confirm = await Swal.fire({
    title: "¿Anular cierre de este repartidor?",
    text: `Se restaurará el stock y se eliminará el cierre de ${email}`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, anular",
    cancelButtonText: "Cancelar",
  });

  if (!confirm.isConfirmed) return;

  setProcesando(true);

  const inicio = startOfDay(fecha);
  const fin = endOfDay(fecha);
  const snap = await getDocs(
    query(
      collection(db, "cierresPorRepartidor"),
      where("fecha", ">=", inicio),
      where("fecha", "<=", fin)
    )
  );

  const cierreDoc = snap.docs.find((doc) => doc.data().repartidor === email);
  if (!cierreDoc) {
    Swal.fire("Error", "No se encontró el cierre para este repartidor.", "error");
    setProcesando(false);
    return;
  }

  const cierreData = cierreDoc.data();
  const resumen = cierreData.productosVendidos || {};

  // Restaurar stock
  const productosSnap = await getDocs(collection(db, "productos"));
  for (const prodDoc of productosSnap.docs) {
    const data = prodDoc.data();
    const devueltos = resumen[data.nombre] || 0;
    await updateDoc(doc(db, "productos", prodDoc.id), {
      stock: data.stock + devueltos,
    });
  }

  // 🔁 Registrar log de anulación
  await addDoc(collection(db, "anulacionesCierre"), {
    tipo: "repartidor",
    fecha,
    emailAdmin: user.email,
    afectado: email,
    productosRevertidos: resumen,
    timestamp: serverTimestamp(),
  });

  await deleteDoc(cierreDoc.ref);

  // ❌ Desmarcar cerradoPorRepartidor en pedidos
  const pedidosSnap = await getDocs(query(
    collection(db, "pedidos"),
    where("fecha", ">=", inicio),
    where("fecha", "<=", fin),
    where("asignadoA", "array-contains", email)
  ));

for (const pedido of pedidosSnap.docs) {
  const data = pedido.data();
  if (data.cerradoPorRepartidor === true) {
    await updateDoc(pedido.ref, { cerradoPorRepartidor: false });
  }
}

  // Eliminar también el documento de cierre en cierresRepartidor
const fechaId = format(fecha, "yyyy-MM-dd");
await deleteDoc(doc(db, "cierresRepartidor", `${email}_${fechaId}`));


  setResumenCierre((prev) => {
    const actualizado = { ...prev };
    delete actualizado[email];
    return actualizado;
  });

  setProcesando(false);
  Swal.fire("✅ Anulado", "El cierre fue eliminado, stock restaurado y logueado.", "success");
};


  return (
    <div className="min-h-screen p-6 bg-base-100 text-base-content">
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
            <div className="mt-4">
              <ul className="pl-5 list-disc">
                {Object.entries(resumenCierre[email]).map(([nombre, cant]) => (
                  <li key={nombre}>{nombre}: {cant} unidades descontadas</li>
                ))}
              </ul>

              {auth.currentUser && admins.includes(auth.currentUser.email) && (
                <button
                  className="mt-4 btn btn-outline btn-error"
                  onClick={() => anularCierreRepartidor(email)}
                  disabled={procesando}
                >
                  ❌ Anular cierre
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default CierreCajaPorRepartidor;
