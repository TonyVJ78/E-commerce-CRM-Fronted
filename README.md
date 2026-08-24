# Kantu Market — Frontend (Angular 19)

Interfaz web y módulo CRM para la plataforma SaaS multitenant **Kantu Market**, desarrollada con **Angular 19** utilizando componentes autónomos (Standalone Components) y diseño moderno responsivo.

## Estructura del Repositorio

```
E-commerce-CRM-Fronted/
├── client/                  → Aplicación Frontend Angular 19
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/        → Guards, Interceptors y Servicios (Auth, Tienda)
│   │   │   ├── features/    → Vistas y formularios (Login, Registro, Tienda, Perfil)
│   │   │   └── shared/      → Componentes compartidos (Navbar, modales)
│   │   ├── environments/    → Configuración de variables y URLs del Backend
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css       → Estilos globales e identidad visual
│   ├── public/              → Recursos estáticos (favicon, logos)
│   ├── angular.json         → Configuración de Angular CLI
│   ├── Dockerfile           → Configuración para despliegue con Docker
│   ├── package.json         → Dependencias y scripts de Node
│   ├── tsconfig.json        → Configuración de TypeScript
│   └── .dockerignore
├── .gitignore
└── README.md
```

##  Inicio Rápido

### Requisitos previos
- [Node.js](https://nodejs.org/) (v20 o superior)
- [npm](https://www.npmjs.com/) (v10 o superior)
- [Angular CLI](https://angular.dev/) v19 (opcional: `npm install -g @angular/cli`)
- O [Docker](https://www.docker.com/)

### 1. Instalación y ejecución local

```bash
cd client
npm install
npm start
```

La aplicación se ejecutará en: [http://localhost:4200](http://localhost:4200)

### 2. Ejecución con Docker

```bash
cd client
docker build -t kantu-frontend .
docker run -p 4200:4200 kantu-frontend
```

---

## Casos de Uso Implementados (Sprint 0)

1. ✅ **CU-01 — Registro de usuario**: Formulario reactivo con selector de rol (`empresa` o `cliente`), validaciones en tiempo real de longitud, mayúsculas, números y confirmación de contraseñas.
2. ✅ **CU-02 — Inicio de sesión**: Formulario de login, conexión con API JWT, almacenamiento seguro de tokens y manejo reactivo del estado de autenticación.
3. ✅ **CU-03 — Cierre de sesión**: Limpieza del almacenamiento local e invalidación del token en backend.
4. ✅ **CU-04 — Perfil de usuario**: Visualización de información del usuario autenticado y formulario para editar nombre, apellido y datos de contacto.
5. ✅ **CU-05 — Recuperación de contraseña**: Flujo completo en 2 pasos: solicitud de enlace por correo y formulario de confirmación de nueva contraseña mediante token.
6. ✅ **CU-06 — Registro de tienda**: Formulario para creación de tienda online (nombre, slug, descripción, teléfono, dirección) para usuarios con rol `empresa`.

---

##  Seguridad y Arquitectura en el Cliente

- **Standalone Components**: Componentes modulares y desacoplados sin necesidad de `NgModule`.
- **AuthGuard**: Protección de rutas privadas (`/perfil`, `/crear-tienda`, `/admin`).
- **AuthInterceptor**: Inyección automática del header `Authorization: Bearer <token>` en todas las peticiones HTTP hacia el Backend.
- **Formularios Reactivos**: `ReactiveFormsModule` con validaciones estrictas y mensajes de error interactivos.

---
