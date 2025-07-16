import React, { useState } from "react";
import { auth, googleProvider } from "../firebase/firebase";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const vendedoresPermitidos = [
  "federudiero@gmail.com",
  "andreitarudiero@gmail.com",
  "vendedor2@gmail.com"
];

function LoginVendedor() {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;

      if (vendedoresPermitidos.includes(email)) {
        localStorage.setItem("vendedorAutenticado", "true");
        localStorage.setItem("emailVendedor", email);
        Swal.fire("✅ Bienvenido", "Acceso concedido como vendedor", "success");
        navigate("/vendedor");
      } else {
        setError("❌ Este correo no está autorizado como vendedor.");
        await auth.signOut();
      }
    } catch (error) {
      setError("❌ Error al iniciar sesión con Google.");
      console.error(error);
    }
  };

return (
  <div className="flex items-center justify-center min-h-screen bg-base-100">
    <div className="w-full max-w-md p-8 shadow-lg card bg-base-200">
      <h2 className="mb-6 text-2xl font-bold text-center">🛒 Acceso de Vendedor</h2>

      <button className="w-full mb-3 text-black btn btn-error" onClick={handleGoogleLogin}>
        🚀 Iniciar sesión con Google
      </button>

      <button
        className="w-full text-white btn btn-outline hover:text-black"
        onClick={() => navigate("/")}
      >
        ⬅ Volver a Home
      </button>

      {error && (
        <div className="mt-4 text-sm alert alert-error">
          {error}
        </div>
      )}
    </div>
  </div>
);
}

export default LoginVendedor;
