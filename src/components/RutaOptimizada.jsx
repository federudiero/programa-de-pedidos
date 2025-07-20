// src/components/RutaOptimizada.js
import React, { useEffect, useState } from "react";
import { GoogleMap, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";

const RutaOptimizada = ({ origin, destination, waypoints, setInstrucciones }) => {
  const [directions, setDirections] = useState(null);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  useEffect(() => {
    if (isLoaded && origin && destination) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: origin.direccion,
          destination: destination.direccion,
          waypoints: waypoints.map(p => ({ location: p.direccion })),
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);

            // Extraer instrucciones paso a paso si se pasó setInstrucciones
            if (setInstrucciones) {
              const steps = result.routes?.[0]?.legs
                ?.flatMap(leg => leg.steps)
                ?.map(step => step.instructions);
              setInstrucciones(steps || []);
            }
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
          center={{ lat: -31.4, lng: -62.1 }}
          zoom={10}
        >
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
      )}
    </div>
  );
};

export default RutaOptimizada;
