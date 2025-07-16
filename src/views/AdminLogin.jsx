import React, { useState } from "react";
import { auth } from "../firebase/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const correosAdmins = [
  "federudiero@gmail.com",
  "admin2@mail.com",
  "admin3@mail.com"
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
    <div className="min-h-screen flex flex-col justify-center items-center bg-base-100 p-6">
      <div className="bg-base-200 shadow-lg rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4">🔐 Acceso Administrador</h2>
        <p className="text-sm text-center mb-6">Iniciá sesión con una cuenta autorizada para acceder a los pedidos.</p>

        <div className="flex flex-col gap-3">
          <button className="btn btn-neutral" onClick={iniciarSesion}>
            Iniciar sesión con Google
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/")}>
            ⬅ Volver al inicio
          </button>
        </div>

        {error && (
          <div className="alert alert-error mt-4 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminLogin;
