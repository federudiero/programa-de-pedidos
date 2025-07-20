import React, { useEffect, useState } from "react";
import { GoogleMap, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";

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
    <div className="h-[500px] w-full">
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ height: "100%", width: "100%" }}
          center={{ lat: -34.65, lng: -58.45 }} // Podés ajustar según tu zona
          zoom={11}
        >
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: false,        // Cambiar a true si querés ocultar pines
                preserveViewport: false        // false = centra y hace zoom automáticamente
              }}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
};

export default RutaOptimizada;
