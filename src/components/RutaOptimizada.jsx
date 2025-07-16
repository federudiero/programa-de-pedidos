import React, { useEffect, useState } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { startOfDay, endOfDay } from "date-fns";

// Punto base
const puntoBase = { lat: -34.688263, lng: -58.546082 };

// Estilo GPS tipo Waze / Circuit
const mapOptions = {
  styles: [
    { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#444" }] },
    { featureType: "landscape", elementType: "all", stylers: [{ color: "#f0f0f0" }] },
    { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "all", stylers: [{ saturation: -100 }, { lightness: 45 }] },
    { featureType: "road.highway", elementType: "all", stylers: [{ visibility: "simplified" }] },
    { featureType: "road.arterial", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "all", stylers: [{ color: "#aadaff" }, { visibility: "on" }] }
  ],
  disableDefaultUI: false,
  zoomControl: true,
};

const RutaOptimizada = ({ fecha, repartidorCampo, setListaOrdenada }) => {
  const [directions, setDirections] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const email = localStorage.getItem("emailRepartidor") || "";
  const esAdmin = ["federudiero@gmail.com", "admin2@mail.com", "admin3@mail.com"].includes(email);

  useEffect(() => {
    const cargarPedidos = async () => {
      setLoading(true);
      const inicio = Timestamp.fromDate(startOfDay(fecha));
      const fin = Timestamp.fromDate(endOfDay(fecha));

      const q = query(
        collection(db, "pedidos"),
        where("fecha", ">=", inicio),
        where("fecha", "<=", fin),
        where("asignadoA", "array-contains", repartidorCampo)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((p) => p.coordenadas?.lat && p.coordenadas?.lng);

      setPedidos(data);
      setLoading(false);
    };

    if (repartidorCampo) cargarPedidos();
  }, [fecha, repartidorCampo]);

  useEffect(() => {
    if (!window.google || pedidos.length === 0) return;

    const directionsService = new window.google.maps.DirectionsService();
    const waypoints = pedidos.map((p) => ({
      location: new window.google.maps.LatLng(p.coordenadas.lat, p.coordenadas.lng),
      stopover: true,
    }));

    directionsService.route(
      {
        origin: puntoBase,
        destination: puntoBase,
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      },
      async (result, status) => {
        if (status === "OK") {
          setDirections(result);
          const orden = result.routes[0].waypoint_order;

          const pedidosOrdenados = orden.map((index, i) => ({
            ...pedidos[index],
            ordenRuta: i + 1,
          }));

          if (esAdmin) {
            for (const pedido of pedidosOrdenados) {
              await updateDoc(doc(db, "pedidos", pedido.id), {
                ordenRuta: pedido.ordenRuta,
              });
            }
          }

          if (setListaOrdenada) setListaOrdenada(pedidosOrdenados);
        } else {
          console.error("Error al generar la ruta:", status);
        }
      }
    );
  }, [pedidos]);

  if (!isLoaded)
    return <p className="text-center text-lg text-gray-600">🗺️ Cargando mapa...</p>;
  if (loading)
    return <p className="text-center text-lg text-blue-600 animate-pulse">🔄 Cargando pedidos...</p>;
  if (pedidos.length === 0)
    return <p className="text-center text-lg text-yellow-600">📭 No hay pedidos asignados a este repartidor.</p>;

  return (
    <div className="mt-6 border rounded-xl shadow-lg overflow-hidden h-[500px]">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={puntoBase}
        zoom={13}
        options={mapOptions}
      >
        <Marker position={puntoBase} label="🏠 Base" />
        {pedidos.map((p) => (
          <Marker
            key={p.id}
            position={{ lat: p.coordenadas.lat, lng: p.coordenadas.lng }}
            title={`Cliente: ${p.nombre}`}
            label={(p.ordenRuta || "").toString()}
          />
        ))}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  );
};

export default RutaOptimizada;
