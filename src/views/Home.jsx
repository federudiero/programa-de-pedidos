import React from "react";
import { useNavigate } from "react-router-dom";


function Home() {
  const navigate = useNavigate();

  const accesos = [
    {
      rol: "🧑 Vendedor",
      texto: "Cargá nuevos pedidos y gestioná tus clientes.",
      btn: "Ingreso Vendedor",
      ruta: "/login-vendedor"
    },
    {
      rol: "🛠️ Administrador",
      texto: "Controlá, editá y visualizá todos los pedidos.",
      btn: "Ingreso Administrador",
      ruta: "/admin"
    },
    {
      rol: "🚚 Repartidor",
      texto: "Accedé a tu hoja de ruta y registrá entregas.",
      btn: "Ingreso Repartidor",
      ruta: "/login-repartidor"
    }
  ];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-10 bg-gradient-to-br from-base-200 via-base-300 to-base-200 text-base-content">
      
      {/* 🔘 Switch de tema */}
      <div className="absolute top-4 right-4">
      
      </div>

      {/* Logo animado */}
      <div className="mb-6 animate-bounce-slow">
        <img
          src="https://res.cloudinary.com/doxadkm4r/image/upload/v1752703043/icono_pedidos_sin_fondo_l6ssgq.png"
          alt="Icono del sistema"
          className="w-32 h-32 p-2 rounded-full shadow-lg md:w-40 md:h-40 bg-base-100"
        />
      </div>

      <h1 className="mb-2 text-4xl font-bold md:text-5xl text-primary">
        📦 Sistema de Pedidos
      </h1>
      <p className="mb-10 text-lg md:text-xl text-base-content/80">
        Seleccioná tu tipo de acceso para continuar
      </p>

      {/* Tarjetas */}
      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {accesos.map(({ rol, texto, btn, ruta }, i) => (
          <div
            key={i}
            className="bg-base-100 text-base-content shadow-xl border border-base-300 rounded-box p-6 flex flex-col justify-between min-h-[250px] transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
          >
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-semibold">{rol}</h2>
              <p className="mt-2 text-sm text-base-content/70">{texto}</p>
            </div>
            <button
              className="w-full mt-4 btn btn-outline text-base-content hover:bg-base-300"
              onClick={() => navigate(ruta)}
            >
              {btn}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
