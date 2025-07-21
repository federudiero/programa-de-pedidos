import React, { useEffect, useState } from "react";
import { GoogleMap, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";
import ThemeSwitcher from "../components/ThemeSwitcher"; // ✅ importado

const RutaOptimizada = ({ origin, destination, waypoints }) => {
  const [directions, setDirections] = useState(null);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const getDireccion = (obj) => obj?.direccion || "";

  useEffect(() => {
    if (isLoaded && origin && destination) {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin: getDireccion(origin),
          destination: getDireccion(destination),
          waypoints: waypoints.map(p => ({ location: getDireccion(p) })),
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error("Error generando ruta:", status);
          }
        }
      );
    }
  }, [isLoaded, origin, destination, waypoints]);

  return (
    <div className="relative h-[500px] w-full">
      {/* 🔘 Botón de cambio de tema fijo arriba a la derecha */}
    

      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ height: "100%", width: "100%" }}
          center={{ lat: -34.65, lng: -58.45 }}
          zoom={11}
        >
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: false,
                preserveViewport: false,
              }}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
};

export default RutaOptimizada;
