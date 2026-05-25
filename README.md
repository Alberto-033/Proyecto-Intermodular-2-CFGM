# 💧 Proyecto Intermodular - Sistema de Riego Inteligente y Automático con Arduino

Este proyecto es una aplicación web full-stack premium y ultra-responsiva diseñada para monitorear y controlar un sistema de riego remoto y automático basado en una placa Arduino (ESP32/ESP8266) conectada localmente.

La aplicación cuenta con un diseño de UI moderno basado en **Glassmorphic Cards**, soporte dinámico de temas (claro/oscuro), traducción instantánea en dos idiomas (Español/Inglés), base de datos integrada SQLite en localhost con cifrado de contraseñas de alta seguridad por **bcrypt**, identificadores por **UUID v4** y un simulador interactivo de placa física.

---

## 📁 Estructura General del Proyecto

```
Proyecto-Intermodular/
├── backend/
│   ├── src/
│   │   ├── index.ts        # Servidor HTTP Express y WebSocket Server
│   │   ├── db.ts           # Gestión de SQLite con Promesas, cifrado bcryptjs y UUIDs
│   │   └── types.ts        # Interfaces de tipos TypeScript del servidor
│   ├── package.json        # Dependencias de backend (bcryptjs, express, sqlite3, ws, uuid)
│   ├── tsconfig.json       # Configuración de compilador TS (NodeNext/ESM)
│   └── database.db         # Base de datos local SQLite (se genera en el primer inicio)
├── frontend/
│   ├── index.html          # Código de cliente 100% limpio (Ctrl+U ultra minimalista)
│   ├── src/
│   │   ├── main.ts         # Orquestador del enrutado y estado global de la SPA
│   │   ├── styles.css      # Sistema de diseño responsivo de 1920x1080 a móviles
│   │   ├── i18n.ts         # Traducciones y gestor de localización (ES/EN)
│   │   ├── api.ts          # Enlace de comunicaciones REST y WebSockets en tiempo real
│   │   └── components/     # Componentes visuales desacoplados
│   │       ├── auth.ts     # Pantalla interactiva de registro y Login
│   │       ├── dashboard.ts# Panel de control de sensores y modo automático/manual
│   │       ├── arduino.ts  # Simulador interactivo de placa Arduino (LED pin 13 + sensores)
│   │       └── settings.ts # Configuración de Tema Claro/Oscuro e Idiomas
│   ├── package.json        # Scripts de Vite y dependencias del Bundler
│   └── vite.config.ts      # Servidor frontend en el puerto 3000
├── arduino/
│   └── irrigation_system.ino # Sketch C++ oficial de Arduino/ESP32 para conexión física
└── README.md               # Este archivo de documentación
```

---

## 🚀 Guía de Inicio Rápido

Como ya tienes Node.js instalado en tu ordenador, puedes iniciar el sistema de inmediato. Sigue estos pasos para arrancar el Servidor y la Aplicación:

### 1. Iniciar el Servidor Backend
Abre una terminal en la carpeta `backend` y ejecuta:
```bash
# Instalar dependencias
npm install

# Compilar y arrancar el servidor en modo desarrollo
npm run dev
```
El servidor backend se iniciará en `http://localhost:3001` y abrirá un servidor WebSocket en `ws://localhost:3001`. Creará automáticamente el archivo de base de datos local `database.db`.

### 2. Iniciar la Aplicación Frontend
Abre otra terminal en la carpeta `frontend` y ejecuta:
```bash
# Instalar dependencias
npm install

# Iniciar el servidor local de desarrollo de Vite
npm run dev
```
La aplicación web se abrirá automáticamente en `http://localhost:3000`.

---

## 🛠️ Plan de Verificación de Requisitos

### 1. Responsividad Adaptativa de Pantalla
- Abre la aplicación en pantalla completa (por ejemplo, a **1920x1080**). Verás una distribución del dashboard en una cuadrícula moderna de múltiples columnas de fácil legibilidad.
- Presiona `F12` en tu navegador para abrir las Herramientas de Desarrollador y activa el modo móvil. Selecciona cualquier teléfono móvil (ej. iPhone o Android). Verás cómo el menú de navegación se reorganiza al centro, las tarjetas se apilan verticalmente de forma fluida y la tabla de logs oculta columnas no prioritarias para adaptarse elegantemente a la pantalla compacta.

### 2. Inspección Limpia de index.html (Ctrl + U)
- Abre la aplicación en tu navegador.
- Haz clic derecho en cualquier parte vacía de la pantalla y selecciona **Ver código fuente de la página** (o presiona `Ctrl + U`).
- Verás que el código HTML devuelto por el servidor es sumamente limpio y minimalista: no contiene scripts inline complejos, estilos embedded pesados ni bloques de código redundantes. Solo contiene el tag `<div id="app"></div>` y la importación de carga del módulo JavaScript principal de TypeScript, garantizando una carga rápida y máxima legibilidad de código.

### 3. Base de Datos SQLite, Cifrado Bcrypt y UUIDs
- Regístrate con un nuevo usuario desde la pantalla de creación de cuenta.
- Para verificar que la contraseña no se almacena en texto plano y que el ID del usuario es un UUID seguro:
  1. Puedes descargar e instalar un visor de bases de datos gratuito como [DB Browser for SQLite](https://sqlitebrowser.org/) o usar una extensión de VSCode para SQLite.
  2. Abre el archivo de base de datos `backend/database.db`.
  3. Ejecuta la consulta SQL: `SELECT * FROM users;`.
  4. Comprobarás que:
     - El campo `id` contiene un identificador único en formato hexadecimal UUID v4 (ej: `550e8400-e29b-41d4-a716-446655440000`) y no un entero simple como `1`.
     - El campo `password_hash` contiene un hash largo codificado de alta seguridad de **bcryptjs** (que inicia con `$2a$10$...`), lo que hace matemáticamente imposible descifrar la clave original si la base de datos es filtrada.

### 4. Multilenguaje y Tema Visual Claro/Oscuro
- Ve a la sección de **Ajustes** (o usa los botones circulares rápidos de la barra de navegación superior).
- Haz clic en el botón de sol/luna ☀️/🌙. La aplicación transicionará suavemente mediante CSS del tema oscuro al tema claro adaptando todos los colores de las fuentes, gradientes de fondo, sombras y estados activos.
- Haz clic en el botón de bandera 🇪🇸/🇬🇧. Toda la interfaz traducirá de inmediato todos los menús, etiquetas, logs e instrucciones en tiempo real sin necesidad de recargar la página. Ambas preferencias se guardan de forma persistente en el `localStorage` de tu navegador para que se recuerden al volver a entrar.

### 5. Simulador Interactivo de Arduino
- Ve a la pestaña **Simulador Arduino**.
- Desliza el slider de **Humedad**. Al arrastrarlo por debajo de tu umbral configurado (ej: 35%), el Relé del Pin 13 en el dibujo del microcontrolador brillará intensamente en color azul indicando que la electroválvula está abierta y regando. Al volver a subir la humedad, el relé se apagará de inmediato, replicando fielmente el comportamiento de la placa física gracias al intercambio de datos por WebSockets.
