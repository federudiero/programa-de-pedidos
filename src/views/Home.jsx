import React from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

const accesos = [
  {
    rol: "🧑 Vendedor",
    texto: "Ingresá para cargar nuevos pedidos.",
    btn: "Ingreso Vendedor",
    ruta: "/login-vendedor"
  },
  {
    rol: "🛠️ Administrador",
    texto: "Visualizá y gestioná todos los pedidos.",
    btn: "Ingreso Administrador",
    ruta: "/admin"
  },
  {
    rol: "🚚 Repartidor",
    texto: "Revisá entregas y generá reportes.",
    btn: "Ingreso Repartidor",
    ruta: "/login-repartidor"
  }
];


  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10 text-center bg-base-200">
      <img
        src="/paintface.jpg"
        alt="Logo de pintura"
        className="object-cover w-40 h-40 mb-6 rounded-full shadow-md"
      />

      <h1 className="mb-4 text-4xl font-extrabold text-white">📦 Sistema de Pedidos</h1>
      <p className="mb-10 text-lg text-gray-300">Seleccioná tu tipo de acceso</p>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        {accesos.map(({ rol, texto, btn,  ruta }, i) => (
          <div
            key={i}
            className="border shadow-xl card bg-base-100 border-base-300"
          >
            <div className="items-center text-center card-body">
              <h2 className="text-white card-title">{rol}</h2>
              <p className="text-gray-300">{texto}</p>
              <button
  className="mt-4 text-white btn bg-primary hover:bg-primary-focus hover:text-black"
  onClick={() => navigate(ruta)}
>
  {btn}
</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
