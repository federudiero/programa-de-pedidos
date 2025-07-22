import React, { useState } from "react";
import { auth } from "../firebase/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import ThemeSwitcher from "../components/ThemeSwitcher";

const correosAdmins = [
  "federudiero@gmail.com",
  "admin2@mail.com",
  "admin3@mail.com",
  "franco.coronel.134@gmail.com",
  "agus.belen64@gmail.com"
];

function AdminLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const iniciarSesion = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const resultado = await signInWithPopup(auth, provider);
      const email = resultado.user.email;

      if (correosAdmins.includes(email)) {
        localStorage.setItem("adminAutenticado", "true");
        navigate("/admin/pedidos");
      } else {
        setError("❌ Este usuario no está autorizado como administrador.");
        await auth.signOut();
      }
    } catch (err) {
      setError("❌ Error al iniciar sesión.");
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-base-100 text-base-content">
      {/* 🔘 Switch de tema */}
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-md p-8 border shadow-lg bg-base-200 rounded-xl border-base-300">
        <h2 className="mb-4 text-2xl font-bold text-center">
          🔐 Acceso Administrador
        </h2>
        <p className="mb-6 text-sm text-center">
          Iniciá sesión con una cuenta autorizada para acceder a los pedidos.
        </p>

        <div className="flex flex-col gap-3">
          <button className="w-full mt-4 btn btn-outline text-base-content hover:bg-base-300" onClick={iniciarSesion}>
            Iniciar sesión con Google
          </button>
          <button className="w-full mt-4 btn btn-outline text-base-content hover:bg-base-300" onClick={() => navigate("/")}>
            ⬅ Volver al inicio
          </button>
        </div>

        {error && (
          <div className="mt-4 text-sm alert alert-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminLogin;
