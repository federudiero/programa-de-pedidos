import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { format, parseISO, getMonth, getYear } from "date-fns";

function EstadisticasPanel() {
  const [loading, setLoading] = useState(true);
  const [cierres, setCierres] = useState([]);
  const [acumuladoProductos, setAcumuladoProductos] = useState({});
  const [rankingRepartidores, setRankingRepartidores] = useState({});
  const [ventasPorDia, setVentasPorDia] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "cierres"));
      const cierresData = snapshot.docs.map((doc) => doc.data());

      const productos = {};
      const repartidores = {};
      const porDia = {};

      cierresData.forEach((cierre) => {
        if (!cierre.fechaStr) return;

        const fechaObj = parseISO(cierre.fechaStr);
        const mes = getMonth(fechaObj);
        const anio = getYear(fechaObj);

        if (mes !== mesSeleccionado || anio !== anioSeleccionado) return;

        const vendidos = cierre.productosVendidos || {};
        let totalDelDia = 0;

        Object.entries(vendidos).forEach(([nombre, cantidad]) => {
          productos[nombre] = (productos[nombre] || 0) + cantidad;
          totalDelDia += cantidad;
        });

        porDia[cierre.fechaStr] = (porDia[cierre.fechaStr] || 0) + totalDelDia;

        const detalle = cierre.detalleRepartidores || {};
        Object.entries(detalle).forEach(([email, pedidos]) => {
          repartidores[email] = (repartidores[email] || 0) + pedidos.length;
        });
      });

      const porDiaArray = Object.entries(porDia)
        .map(([fecha, cantidad]) => ({
          fecha,
          cantidad,
        }))
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      setCierres(cierresData);
      setAcumuladoProductos(productos);
      setRankingRepartidores(repartidores);
      setVentasPorDia(porDiaArray);
      setLoading(false);
    };

    fetchData();
  }, [mesSeleccionado, anioSeleccionado]);

  const productoTop = Object.entries(acumuladoProductos).sort((a, b) => b[1] - a[1])[0];
  const repartidorTop = Object.entries(rankingRepartidores).sort((a, b) => b[1] - a[1])[0];
  const chartData = Object.entries(acumuladoProductos).map(([nombre, cantidad]) => ({
    nombre,
    cantidad,
  }));

  return (
    <div className="min-h-screen px-4 py-6 mx-auto" style={{ backgroundColor: "#f4f5fa", color: "#1f2937" }}>
      <h2 className="mb-6 text-3xl font-bold">📈 Panel de Estadísticas</h2>

      {/* Selector de mes y año */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="font-semibold">📅 Seleccionar mes:</label>
        <select
          className="text-gray-800 select select-bordered"
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {new Date(0, i).toLocaleString("es-AR", { month: "long" })}
            </option>
          ))}
        </select>

        <select
          className="text-gray-800 select select-bordered"
          value={anioSeleccionado}
          onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <option key={i} value={2023 + i}>
              {2023 + i}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-center">Cargando datos...</p>
      ) : (
        <>
          <div className="grid gap-6 mb-8 md:grid-cols-2">
            <div className="p-4 bg-white border rounded-lg shadow-md">
              <h3 className="mb-2 text-xl font-semibold">🥇 Producto más vendido</h3>
              {productoTop ? (
                <p>
                  <strong>{productoTop[0]}</strong>: {productoTop[1]} unidades
                </p>
              ) : (
                <p>No hay productos registrados aún.</p>
              )}
            </div>

            <div className="p-4 bg-white border rounded-lg shadow-md">
              <h3 className="mb-2 text-xl font-semibold">🏅 Repartidor con más entregas</h3>
              {repartidorTop ? (
                <p>
                  <strong>{repartidorTop[0]}</strong>: {repartidorTop[1]} pedidos
                </p>
              ) : (
                <p>No hay entregas registradas aún.</p>
              )}
            </div>
          </div>

          <div className="p-4 mb-8 bg-white border rounded-lg shadow-md">
            <h3 className="mb-4 text-xl font-semibold">📦 Productos más vendidos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 40 }}
                barCategoryGap="15%"
                barGap={5}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis type="number" stroke="#4b5563" />
                <YAxis dataKey="nombre" type="category" stroke="#4b5563" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f9fafb",
                    borderColor: "#4ade80",
                    color: "#1f2937",
                  }}
                />
                <Bar dataKey="cantidad" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-4 bg-white border rounded-lg shadow-md">
            <h3 className="mb-4 text-xl font-semibold">📅 Evolución de ventas por día</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ventasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={(f) => format(new Date(f), "dd/MM")}
                  stroke="#4b5563"
                />
                <YAxis stroke="#4b5563" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f9fafb",
                    borderColor: "#3b82f6",
                    color: "#1f2937",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cantidad"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ stroke: "#3b82f6", strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <details className="mt-6">
            <summary className="text-sm cursor-pointer">📂 Ver JSON de cierres</summary>
            <pre className="p-2 overflow-x-auto text-xs text-gray-800 bg-gray-100 rounded max-h-64">
              {JSON.stringify(cierres, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

export default EstadisticasPanel;
