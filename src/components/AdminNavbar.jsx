import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { signOut } from "firebase/auth";
import { LogOut, Menu } from "lucide-react";

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin"); // Ir al login de administrador
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="z-50 px-4 shadow-md navbar bg-base-100">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <Menu className="w-5 h-5" />
          </label>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li><Link to="/admin/pedidos">Pedidos</Link></li>
            <li><Link to="/admin/stock">Stock</Link></li>
            <li><Link to="/admin/dividir-pedidos">División de Pedidos</Link></li>
            <li><Link to="/admin/estadisticas">Estadísticas</Link></li>
            <li><Link to="/admin/cierre-caja">Cierre de Caja</Link></li>
            <li><Link to="/admin/panel-stock">Panel Stock</Link></li>
            <li><button onClick={handleLogout}>Cerrar Sesión</button></li>
          </ul>
        </div>
        
      </div>

      <div className="hidden navbar-center lg:flex">
        <ul className="px-1 menu menu-horizontal">
          <li><Link to="/admin/pedidos">Pedidos</Link></li>
          <li><Link to="/admin/stock">Stock</Link></li>
          <li><Link to="/admin/dividir-pedidos">División</Link></li>
          <li><Link to="/admin/estadisticas">Estadísticas</Link></li>
          <li><Link to="/admin/cierre-caja">Cierre Caja</Link></li>
          <li><Link to="/admin/panel-stock">Panel Stock</Link></li>
        </ul>
      </div>

      <div className="navbar-end">
        <button onClick={handleLogout} className="btn btn-outline btn-sm">
          <LogOut className="w-4 h-4 mr-1" />
          Salir
        </button>
      </div>
    </div>
  );
};

export default AdminNavbar;
