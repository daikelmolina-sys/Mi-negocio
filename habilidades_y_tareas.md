# Skills y Flujo de Trabajo (Antigravity Framework)

## Tech Stack Obligatorio
*   **Frontend:** HTML5, CSS3 (variables CSS para temas), Vanilla JavaScript (ES6+ Modules). **Prohibido usar frameworks pesados (React/Vue/Angular)**.
*   **Backend:** Node.js, Express.js.
*   **Base de Datos:** PostgreSQL (recomendado para transacciones financieras y de inventario) o SQLite para modo local.
*   **Herramientas Extra:** `xlsx` (para carga masiva), `pdfkit` o similar (para reportes), `bcrypt` (seguridad de usuarios).

## Skill 1: Carga Masiva de Excel (Importación)
*   **Descripción:** Crear un endpoint `/api/inventory/bulk-upload` que reciba un archivo `.xlsx` (referencia: `BD EDWUARD.xlsx`).
*   **Acción:** El sistema debe leer las filas, validar las columnas requeridas (Nombre, Precio, Costo, Stock Inicial, Categoría) y realizar un `bulk insert` en la base de datos.
*   **Frontend:** Crear una zona de "Drag & Drop" estilizada para subir el archivo con una barra de progreso.

## Skill 2: UI Innovadora y Tema Claro/Oscuro
*   **Descripción:** Implementar un sistema de temas usando variables nativas de CSS (`:root`). 
*   **Acción:** El frontend debe incluir un "Switch" animado en la barra lateral. Al cambiar, se deben invertir los colores de fondo, textos y sombras. 
*   **Estilo Visual:** Usar un enfoque de diseño premium (ej. tarjetas con bordes redondeados suaves, sombras difusas, efectos de desenfoque de fondo si aplica, fuentes modernas como Inter o Poppins). Evitar tablas HTML estándar; usar CSS Grid para mostrar los productos y cajas.

## Skill 3: Lógica de Caja, Ventas y Multimoneda
*   **Descripción:** Implementar el flujo estricto del negocio.
*   **Acción:**
    1.  Bloquear ventas si la caja no está "Abierta" con un monto inicial.
    2.  Permitir cobrar en múltiples métodos de pago simultáneos.
    3.  Aplicar conversión de moneda en tiempo real (Ej: Mostrar precios en $ USD pero calcular el equivalente en Bolívares VES según la tasa configurada en Ajustes).
    4.  Módulo de Créditos ("Fiados"): Crear deudas asignadas a clientes con fecha de vencimiento.

## Skill 4: Arquitectura Frontend Modular (Vanilla JS)
*   **Descripción:** Como no se usarán frameworks, el código JS debe estar modularizado.
*   **Acción:** Crear un enrutador simple en el cliente (Client-side router) para cambiar entre vistas (Dashboard, Ventas, Inventario) sin recargar la página (SPA approach), usando `fetch` para comunicarse con la API de Node.js.