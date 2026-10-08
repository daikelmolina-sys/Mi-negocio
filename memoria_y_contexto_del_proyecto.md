# Memoria de Contexto (Antigravity Framework)

## Contexto del Proyecto
*   **Cliente:** Propietario de una bodega/minimarket local.
*   **Objetivo Principal:** Reemplazar los métodos manuales con un sistema web moderno, rápido y estéticamente superior a la competencia.
*   **Estructura de Vistas Requerida (Basado en wireframes previos):**
    1.  **Inicio:** Dashboard con métricas clave (Ganancias, Productos, Stock bajo, Inversión).
    2.  **Venta:** Punto de venta ágil, búsqueda rápida por código de barras o nombre.
    3.  **Productos / Inventario:** Gestión CRUD de catálogo y control estricto de entradas/salidas (movimientos).
    4.  **Reportes:** Generación de resúmenes diarios, cierres de caja y etiquetas.
    5.  **Créditos:** Gestión de cuentas por cobrar (clientes que deben dinero).
    6.  **Cajas:** Apertura, cierre y cuadre de efectivo.
    7.  **Ajustes:** Tasa de cambio (Crucial: manejo de devaluación/inflación local, tasa $ vs VES), configuración de negocio, claves de seguridad.

## Restricciones y Reglas de Negocio
*   **Modo Híbrido:** El sistema debe sentirse instantáneo. Considerar caching de productos en el frontend (`localStorage` o `IndexedDB`) para que la búsqueda en el Punto de Venta no tenga lag por peticiones de red constantes.
*   **Seguridad por Capas:** Existen funciones que requieren un PIN de administrador (ej. editar el stock de un producto manualmente o cambiar la tasa de moneda).
*   **Identidad Visual:** La directiva del usuario es clara: **"Que no sea un frontend genérico, sino innovador y muy poco visto"**. El equipo de diseño de IA debe priorizar animaciones sutiles, estados vacíos (empty states) amigables, y una paleta de colores adaptable (Light/Dark).

## Notas sobre Archivos de Datos
*   El archivo "BD EDWUARD.xlsx" es el estándar base. El sistema debe ser tolerante a errores: si una celda de precio viene vacía o con letras, el backend debe ignorarla o asignar 0 y devolver un reporte de "Filas no importadas" en lugar de colapsar (crash).