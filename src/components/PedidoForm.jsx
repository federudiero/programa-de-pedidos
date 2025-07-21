import React, { useRef, useState, useEffect } from "react";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import { GoogleMap, Marker } from "@react-google-maps/api";
import Swal from "sweetalert2";
import { productosCatalogo } from '../components/productosCatalogo';


const PedidoForm = ({ onAgregar, onActualizar, pedidoAEditar }) => {
  const autoCompleteRef = useRef(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [coordenadas, setCoordenadas] = useState(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [partido, setPartido] = useState("");
  const [direccion, setDireccion] = useState("");
  const [entreCalles, setEntreCalles] = useState("");

  const [errorNombre, setErrorNombre] = useState("");
  const [errorTelefono, setErrorTelefono] = useState("");

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"]
  });

  useEffect(() => {
    if (pedidoAEditar) {
      setNombre(pedidoAEditar.nombre || "");
      setTelefono(pedidoAEditar.telefono || "");
      setDireccion(pedidoAEditar.direccion || "");
      setEntreCalles(pedidoAEditar.entreCalles || "");
      setPartido(pedidoAEditar.partido || "");

      const nuevosProductos = [];
      productosCatalogo.forEach((p) => {
        const regex = new RegExp(`${p.nombre} x(\\d+)`);
        const match = pedidoAEditar.pedido.match(regex);
        if (match) {
          nuevosProductos.push({ ...p, cantidad: parseInt(match[1]) });
        }
      });
      setProductosSeleccionados(nuevosProductos);
    }
  }, [pedidoAEditar]);

  const handlePlaceChanged = () => {
    const place = autoCompleteRef.current.getPlace();
    const direccionCompleta = place.formatted_address || "";
    const plusCode = place.plus_code?.global_code || "";
    const direccionFinal = plusCode
      ? `${plusCode} - ${direccionCompleta}`
      : direccionCompleta;
    setDireccion(direccionFinal);

    const location = place.geometry?.location;
    if (location) {
      setCoordenadas({
        lat: location.lat(),
        lng: location.lng()
      });
    }
  };

  const calcularResumenPedido = () => {
    const resumen = productosSeleccionados
      .map(p => `${p.nombre} x${p.cantidad} ($${p.precio * p.cantidad})`)
      .join(" - ");
    const total = productosSeleccionados.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    return { resumen, total };
  };

  const resetFormulario = () => {
    setNombre("");
    setTelefono("");
    setPartido("");
    setDireccion("");
    setEntreCalles("");
    setProductosSeleccionados([]);
  };

  const onSubmit = () => {
    if (
      !nombre.trim() ||
      !telefono.trim() ||
      !direccion.trim() ||
      productosSeleccionados.length === 0 ||
      errorNombre ||
      errorTelefono
    ) {
      return Swal.fire("❌ Por favor completá todos los campos requeridos y agregá al menos un producto.");
    }

    const { resumen, total } = calcularResumenPedido();
    const pedidoFinal = `${resumen} | TOTAL: $${total}`;

    const pedidoConProductos = {
      nombre,
      telefono,
      partido,
      direccion,
      entreCalles,
      pedido: pedidoFinal,
      coordenadas,
    };

    if (pedidoAEditar) {
      onActualizar({ ...pedidoAEditar, ...pedidoConProductos });
      Swal.fire("✅ Pedido actualizado correctamente.");
    } else {
      onAgregar(pedidoConProductos);
      Swal.fire("✅ Pedido cargado correctamente.");
    }

    resetFormulario();
  };

  return isLoaded ? (
    <>
     

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* DATOS DEL CLIENTE */}
          <div className="shadow-lg card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">🧑 Datos del cliente</h2>

              <label className="label">
                <span className="label-text">👤 Nombre</span>
              </label>
              <input
                type="text"
                className="w-full input input-bordered"
                value={nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  setNombre(val);
                  setErrorNombre(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val) ? "" : "❌ Solo letras y espacios.");
                }}
              />
              {errorNombre && <p className="text-sm text-error">{errorNombre}</p>}

              <label className="label">
                <span className="label-text">🏠 Calle y altura</span>
              </label>
              <Autocomplete onLoad={(a) => (autoCompleteRef.current = a)} onPlaceChanged={handlePlaceChanged}>
                <input
                  className="w-full input input-bordered"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Buscar dirección"
                />
              </Autocomplete>

              {coordenadas && (
                <div className="h-48 my-4 overflow-hidden border rounded-lg border-base-300">
                  <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={coordenadas} zoom={16}>
                    <Marker position={coordenadas} />
                  </GoogleMap>
                </div>
              )}

              <label className="label">
                <span className="label-text">🗒️ Observación (entre calles)</span>
              </label>
              <input
                type="text"
                className="w-full input input-bordered"
                value={entreCalles}
                onChange={(e) => setEntreCalles(e.target.value)}
              />

              <label className="label">
                <span className="label-text">🌆 Ciudad o partido</span>
              </label>
              <input
                type="text"
                className="w-full input input-bordered"
                value={partido}
                onChange={(e) => setPartido(e.target.value)}
              />

              <label className="label">
                <span className="label-text">📞 Teléfono</span>
              </label>
              <input
                type="text"
                className="w-full input input-bordered"
                value={telefono}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setTelefono(val);
                  setErrorTelefono(/^[0-9]{6,15}$/.test(val) ? "" : "❌ Solo números (6 a 15 dígitos).");
                }}
              />
              {errorTelefono && <p className="text-sm text-error">{errorTelefono}</p>}
            </div>
          </div>

          {/* PRODUCTOS */}
          <div className="shadow-lg card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">🛒 Productos</h2>

              <div className="p-2 overflow-y-auto border rounded-lg bg-base-100 border-base-300 h-72">
                {productosCatalogo.map((prod, idx) => {
                  const cantidad = productosSeleccionados.find(p => p.nombre === prod.nombre)?.cantidad || 0;
                  return (
                    <div key={idx} className="flex items-center justify-between mb-2">
                      <span className="w-2/3 truncate">{prod.nombre} - ${prod.precio.toLocaleString()}</span>
                      <input
                        type="number"
                        min="0"
                        value={cantidad}
                        onChange={(e) => {
                          const cant = parseInt(e.target.value, 10);
                          setProductosSeleccionados((prev) => {
                            const sinEste = prev.filter(p => p.nombre !== prod.nombre);
                            return cant > 0 ? [...sinEste, { ...prod, cantidad: cant }] : sinEste;
                          });
                        }}
                        className="w-20 input input-bordered input-sm"
                      />
                    </div>
                  );
                })}
              </div>

              <label className="mt-4 label">
                <span className="label-text">📝 Pedido generado</span>
              </label>
              <textarea
                readOnly
                rows={4}
                className="w-full textarea textarea-bordered"
                value={
                  calcularResumenPedido().resumen +
                  (productosSeleccionados.length ? ` | TOTAL: $${calcularResumenPedido().total}` : "")
                }
              />

              <button
                type="submit"
                className={`btn mt-6 w-full ${pedidoAEditar ? "btn-warning" : "btn-success"}`}
              >
                {pedidoAEditar ? "✏️ Actualizar Pedido" : "✅ Agregar Pedido"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  ) : <p className="text-center">Cargando Google Maps...</p>;
};

export default PedidoForm;
