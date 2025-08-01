import React, { useEffect, useState } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { BASE_DIRECCION } from "../config";

const cleanMapOptions = {
  styles: [
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      stylers: [{ visibility: "off" }],
    },
  ],
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  zoomControl: true,
  draggable: true,
  scrollwheel: true,
};

const RutaOptimizada = ({ waypoints, onOrdenOptimizado, optimizar = true }) => {
  const [directions, setDirections] = useState(null);
  const [paradas, setParadas] = useState([]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const getDireccion = (obj) => {
    if (!obj?.direccion) return "";
    const direccionLimpia = obj.direccion.replace(/^(\w{4,}\+\w{2,})\s*-\s*/i, "").trim();
    return direccionLimpia;
  };

  useEffect(() => {
  if (!isLoaded || waypoints.length === 0) return;

  const directionsService = new window.google.maps.DirectionsService();

  const mappedWaypoints = waypoints.map((p) => ({
    location: getDireccion(p),
    stopover: true,
  }));

  directionsService.route(
    {
      origin: BASE_DIRECCION,
      destination: BASE_DIRECCION,
      waypoints: mappedWaypoints,
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: optimizar,
    },
    (result, status) => {
      if (status === "OK" && result) {
        setDirections(result);

     if (onOrdenOptimizado) {
  if (optimizar) {
    const orden = result.routes[0].waypoint_order;
    const ordenado = orden.map((i) => waypoints[i]);
    onOrdenOptimizado(ordenado);
  } else {
    onOrdenOptimizado(waypoints); // respetá el orden manual
  }
}
        const legs = result.routes[0].legs;
        const ubicaciones = legs.slice(0, -1).map((leg) => ({
          position: leg.end_location,
          direccion: leg.end_address,
        }));
        setParadas(ubicaciones);
      } else {
        console.error("❌ Error generando ruta:", status);
      }
    }
  );
}, [isLoaded, JSON.stringify(waypoints), optimizar]);

  return (
    <div className="my-6 overflow-hidden border shadow-md border-base-300 rounded-xl bg-base-100">
      <div className="p-4 font-bold text-base-content">🗺️ Ruta en el mapa</div>
      <div style={{ height: "500px" }}>
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={{ lat: -34.705977, lng: -58.523331 }}
            zoom={11}
            options={cleanMapOptions}
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
    </div>
  );
};

export default RutaOptimizada;
