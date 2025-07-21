import React, { useEffect, useState } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { BASE_DIRECCION } from "../config";

const RutaOptimizada = ({ waypoints, onOrdenOptimizado }) => {
  const [directions, setDirections] = useState(null);
  const [paradas, setParadas] = useState([]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const getDireccion = (obj) => obj?.direccion || "";

  useEffect(() => {
    if (isLoaded && waypoints.length > 0) {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin: BASE_DIRECCION,
          destination: BASE_DIRECCION,
          waypoints: waypoints.map((p) => ({
            location: getDireccion(p),
            stopover: true,
          })),
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        },
        (result, status) => {
          if (status === "OK" && result) {
            setDirections(result);

            // 🧠 Obtener orden optimizado y notificar
            const orden = result.routes[0].waypoint_order;
            if (onOrdenOptimizado) {
              const ordenado = orden.map((i) => waypoints[i]);
              onOrdenOptimizado(ordenado);
            }

            // 🧭 Extraer coordenadas de cada parada
            const legs = result.routes[0].legs;
            const ubicaciones = legs
              .slice(0, -1) // quitar el último porque es la vuelta a la base
              .map((leg) => ({
                position: leg.end_location,
                direccion: leg.end_address,
              }));
            setParadas(ubicaciones);
          } else {
            console.error("❌ Error generando ruta:", status);
          }
        }
      );
    }
  }, [isLoaded, waypoints]);

  return (
    <div className="my-4 overflow-hidden border rounded-xl" style={{ height: "500px" }}>
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={{ lat: -34.705977, lng: -58.523331 }} // BASE
          zoom={11}
        >
          {directions && <DirectionsRenderer directions={directions} />}

          {paradas.map((parada, index) => (
            <Marker
              key={index}
              position={parada.position}
              label={`${index + 1}`}
              title={parada.direccion}
            />
          ))}
        </GoogleMap>
      )}
    </div>
  );
};

export default RutaOptimizada;
