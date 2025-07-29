import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebase";

import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import Swal from "sweetalert2";
import { format } from "date-fns";

const zonasCABA = [
  { lat: -34.6037, lng: -58.3816, direccion: "Av. Corrientes 1234, CABA" },
  { lat: -34.5889, lng: -58.4326, direccion: "Av. Santa Fe 4567, Palermo" },
  { lat: -34.6192, lng: -58.4088, direccion: "Av. La Plata 1000, Caballito" },
  { lat: -34.5762, lng: -58.4269, direccion: "Av. Libertador 3000, Belgrano" },
  { lat: -34.6118, lng: -58.4173, direccion: "Rivadavia 2700, Almagro" },
  { lat: -34.5858, lng: -58.4202, direccion: "Fitz Roy 800, Palermo Hollywood" },
  { lat: -34.6358, lng: -58.4102, direccion: "Inclán 3000, Parque Patricios" },
];

const nombresEjemplo = ["Juan Pérez", "Ana López", "Carlos Gómez", "María Fernández", "Pedro Álvarez", "Lucía Torres", "Sofía Ramírez", "Gonzalo Díaz"];

const GeneradorPedidosTest = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔐 Login automático como federudiero@gmail.com
  useEffect(() => {
    const login = async () => {
      try {
       if (!auth.currentUser) {
  throw new Error("No hay usuario autenticado.");
}

console.log("✅ Usuario ya autenticado:", auth.currentUser.email);


        const snapshot = await getDocs(collection(db, "productos"));
        const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProductos(lista);
      } catch (error) {
        console.error("Error en login o carga de productos:", error);
        Swal.fire("❌ Error en login o en carga de productos.");
      } finally {
        setLoading(false);
      }
    };

    login();
  }, []);

  const generarPedido = () => {
    const nombre = nombresEjemplo[Math.floor(Math.random() * nombresEjemplo.length)];
    const telefono = "11" + Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
    const zona = zonasCABA[Math.floor(Math.random() * zonasCABA.length)];

    const cantidadProductos = Math.floor(Math.random() * 3) + 1;
    const productosSeleccionados = [];
    const indicesUsados = new Set();

    while (productosSeleccionados.length < cantidadProductos && productos.length > 0) {
      const indice = Math.floor(Math.random() * productos.length);
      if (!indicesUsados.has(indice)) {
        indicesUsados.add(indice);
        productosSeleccionados.push({
          nombre: productos[indice].nombre,
          cantidad: Math.floor(Math.random() * 3) + 1,
          precio: productos[indice].precio,
        });
      }
    }

    const resumen = productosSeleccionados
      .map((p) => `${p.nombre} x${p.cantidad} ($${p.precio * p.cantidad})`)
      .join(" - ");
    const total = productosSeleccionados.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
    const pedidoFinal = `${resumen} | TOTAL: $${total}`;

    const ahora = new Date();
    const fechaStr = format(ahora, "yyyy-MM-dd");

    return {
      nombre,
      telefono,
      partido: "CABA",
      direccion: zona.direccion,
      entreCalles: "Av. 1 y Calle 2",
      pedido: pedidoFinal,
      productos: productosSeleccionados.map((p) => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
      })),
      coordenadas: { lat: zona.lat, lng: zona.lng },
      fecha: Timestamp.fromDate(ahora),
      fechaStr,
      entregado: true,
    };
  };

  const generarPedidos = async () => {
    const confirmacion = await Swal.fire({
      title: "¿Generar 90 pedidos de prueba ENTREGADOS?",
      text: "Se crearán pedidos ficticios ya marcados como entregados.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, crear",
    });

    if (!confirmacion.isConfirmed) return;

    try {
      for (let i = 0; i < 90; i++) {
        const pedido = generarPedido();
        await addDoc(collection(db, "pedidos"), pedido);
      }

      Swal.fire("✅ 90 pedidos entregados generados exitosamente.");
    } catch (error) {
      console.error("Error al generar pedidos:", error);
      Swal.fire("❌ Error al generar pedidos.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-bold">🧪 Generador de Pedidos de Prueba</h2>
      {loading ? (
        <div className="p-4 text-center bg-base-200 text-base-content rounded-xl">
          ⚠️ Autenticando usuario y esperando productos...
        </div>
      ) : (
        <button className="btn btn-success" onClick={generarPedidos}>
          ✅ Generar 90 pedidos entregados
        </button>
      )}
    </div>
  );
};

export default GeneradorPedidosTest;
