import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import Swal from "sweetalert2";

const repartidoresPermitidos = [
  "repartidor1@gmail.com",
  "repartidor2@gmail.com",
  "repartidor3@gmail.com",
  "repartidor4@gmail.com",
];

function LoginRepartidor() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      if (repartidoresPermitidos.includes(user.user.email)) {
        localStorage.setItem("repartidorAutenticado", "true");
        localStorage.setItem("emailRepartidor", user.user.email);
        navigate("/repartidor");
      } else {
        Swal.fire("❌ No tenés permisos de repartidor");
      }
    } catch (err) {
      Swal.fire("❌ Error al ingresar: " + err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const emailGoogle = result.user.email;

      if (repartidoresPermitidos.includes(emailGoogle)) {
        localStorage.setItem("repartidorAutenticado", "true");
        localStorage.setItem("emailRepartidor", emailGoogle);
        navigate("/repartidor");
      } else {
        Swal.fire("❌ No tenés permisos de repartidor con esta cuenta de Google");
      }
    } catch (error) {
      Swal.fire("❌ Error con Google: " + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-base-200">
      <div className="w-full max-w-md p-8 space-y-4 shadow-xl bg-base-100 rounded-xl">
        <h3 className="text-2xl font-bold text-center text-white">🚚 Acceso Repartidor</h3>

        <input
          type="email"
          className="w-full input input-bordered"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full input input-bordered"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <div className="flex flex-col gap-2">
         <button className="text-white bg-blue-600 btn hover:bg-blue-700" onClick={handleLogin}>
  🔐 Ingresar
</button>
          <button className="text-dark btn btn-error" onClick={handleGoogleLogin}>
            🚀 Ingresar con Google
          </button>
        </div>

        <button
          className="w-full mt-4 text-dark btn btn-outline hover:text-black"
          onClick={() => navigate("/")}
        >
          ⬅ Volver a Home
        </button>
      </div>
    </div>
  );
}

export default LoginRepartidor;
