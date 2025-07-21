// RutaOptimizada.jsx
import React, { useEffect, useState } from "react";
import { GoogleMap, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { Marker } from "@react-google-maps/api";


const RutaOptimizada = ({ origin, destination, waypoints, onOrdenOptimizado }) => {
  const [directions, setDirections] = useState(null);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const getDireccion = (obj) => obj?.direccion || "";

  useEffect(() => {
    if (isLoaded && origin && destination && waypoints.length > 0) {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
         origin: origin.lat ? origin : getDireccion(origin),
destination: destination.lat ? destination : getDireccion(destination),
          waypoints: waypoints.map(p => ({ location: getDireccion(p) })),
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        },
        (result, status) => {
          if (status === "OK") {
            setDirections(result);
            const orden = result.routes[0].waypoint_order;
            if (onOrdenOptimizado) onOrdenOptimizado(orden);
          } else {
            console.error("Error generando ruta:", status);
          }
        }
      );
    }
  }, [isLoaded, origin, destination, waypoints]);

  return (
    <div className="relative h-[500px] w-full">
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
  {origin.lat && <Marker position={origin} label="Base" />}
</GoogleMap>
      )}
    </div>
  );
};

export default RutaOptimizada;
