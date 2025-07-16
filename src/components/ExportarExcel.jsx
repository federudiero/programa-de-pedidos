import React from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

const ExportarExcel = ({ pedidos }) => {
  const exportar = () => {
    const wsData = pedidos.map((p) => [
      p.nombre || "",
      "Buenos Aires",
      p.partido || "",
      "", // ORDEN vacío
      p.direccion || "",
      p.telefono || "",
      "feder",
      p.pedido || "",
      p.entreCalles || ""
    ]);

    const encabezados = [
      [
        "NOMBRE",
        "PROVINCIA",
        "CIUDAD",
        "ORDEN",
        "CALLE Y ALTURA",
        "TELEFONO",
        "VENDEDOR",
        "PEDIDO",
        "OBSERVACION"
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([...encabezados, ...wsData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

    const fecha =
      pedidos.length > 0 && pedidos[0].fecha?.toDate
        ? pedidos[0].fecha.toDate()
        : new Date();

    const fechaFormateada = format(fecha, "dd-MM-yyyy");
    const nombreArchivo = `planilla_pedidos_${fechaFormateada}.xlsx`;

    XLSX.writeFile(wb, nombreArchivo);
  };

  return (
    <button onClick={exportar} className="btn btn-success mt-4">
      📥 Descargar Excel
    </button>
  );
};

export default ExportarExcel;
