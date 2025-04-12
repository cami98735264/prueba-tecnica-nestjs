# API de Gestión de Tareas

Una API RESTful construida con NestJS, TypeORM y PostgreSQL para gestionar tareas con autenticación JWT y control de acceso basado en roles.

## Características

- Autenticación JWT con tokens de actualización
- Control de acceso basado en roles (roles USER y ADMIN)
- Operaciones CRUD para tareas
- Filtrado y paginación de tareas
- Documentación Swagger
- Soporte para Docker
- Manejo integral de errores
- Validación de entrada
- Cifrado seguro de contraseñas
- Pruebas unitarias y de integración

## Estructura del Proyecto

```
src/
├── auth/                    # Módulo de autenticación
│   ├── dto/                # Data Transfer Objects
│   ├── guards/             # Guards de autenticación
│   ├── auth.controller.ts  # Controlador de autenticación
│   ├── auth.service.ts     # Servicio de autenticación
│   └── auth.module.ts      # Módulo de autenticación
├── common/                 # Código compartido
│   ├── decorators/        # Decoradores personalizados
│   ├── filters/           # Filtros de excepciones
│   ├── guards/            # Guards de autorización
│   └── pipes/             # Pipes de validación
├── config/                # Configuración de la aplicación
│   └── database.config.ts # Configuración de la base de datos
├── tasks/                 # Módulo de tareas
│   ├── dto/              # Data Transfer Objects
│   ├── entities/         # Entidades de TypeORM
│   ├── tasks.controller.ts # Controlador de tareas
│   ├── tasks.service.ts  # Servicio de tareas
│   └── tasks.module.ts   # Módulo de tareas
├── users/                 # Módulo de usuarios
│   ├── entities/         # Entidades de TypeORM
│   └── users.module.ts   # Módulo de usuarios
├── app.controller.ts     # Controlador principal
├── app.module.ts         # Módulo principal
└── main.ts              # Punto de entrada

test/                     # Pruebas
├── database.integration.spec.ts # Pruebas de integración
└── ...                  # Otras pruebas

```

## Requisitos Previos

- Node.js (v18 o superior)
- PostgreSQL
- Docker y Docker Compose (opcional)

## Instalación

### Sin Docker

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd task-management-api
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear un archivo `.env` en el directorio raíz con las siguientes variables:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=task_management
JWT_SECRET=tu-clave-secreta
JWT_EXPIRATION=1h
REFRESH_TOKEN_SECRET=tu-clave-secreta-de-actualizacion
REFRESH_TOKEN_EXPIRATION=7d
```

### Con Docker

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd task-management-api
```

2. Construir y ejecutar los contenedores:
```bash
docker-compose up --build
```

## Ejecución de la Aplicación

### Sin Docker

#### Desarrollo
```bash
npm run start:dev
```

#### Producción
```bash
npm run build
npm run start:prod
```

### Con Docker

#### Desarrollo
```bash
docker-compose up --build
```

#### Producción
```bash
docker-compose -f docker-compose.prod.yml up --build
```

## Usuario Administrador

El sistema incluye un usuario administrador por defecto:
- Email: `admin@example.com`
- Contraseña: `password123`

Para crear un nuevo usuario administrador, simplemente registra un usuario con el email `admin@example.com`. El sistema asignará automáticamente el rol de administrador.

## Documentación de la API

Una vez que la aplicación esté en ejecución, puedes acceder a la documentación Swagger en:
```
http://localhost:3000/api
```

## Endpoints de la API

### Autenticación

#### Registrar un nuevo usuario
```http
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

#### Iniciar sesión
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

#### Obtener perfil de usuario
```http
GET /auth/profile
Authorization: Bearer <token_de_acceso>
```

#### Actualizar token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "<token_de_actualizacion>"
}
```

### Tareas

#### Obtener todas las tareas (con filtros y paginación)
```http
GET /tasks?status=TODO&dueDate=2024-04-15&page=1&limit=10
Authorization: Bearer <token_de_acceso>
```

Parámetros de consulta:
- `status`: Filtrar por estado de la tarea (TODO, IN_PROGRESS, DONE)
- `dueDate`: Filtrar por fecha de vencimiento (formato ISO)
- `page`: Número de página (debe ser positivo)
- `limit`: Elementos por página (debe ser positivo)

#### Crear una nueva tarea
```http
POST /tasks
Authorization: Bearer <token_de_acceso>
Content-Type: application/json

{
  "title": "Título de la tarea",
  "description": "Descripción de la tarea",
  "status": "TODO",
  "dueDate": "2024-04-15T00:00:00.000Z"
}
```

#### Obtener una tarea específica
```http
GET /tasks/:id
Authorization: Bearer <token_de_acceso>
```

#### Actualizar una tarea
```http
PATCH /tasks/:id
Authorization: Bearer <token_de_acceso>
Content-Type: application/json

{
  "title": "Título actualizado",
  "description": "Descripción actualizada",
  "status": "IN_PROGRESS",
  "dueDate": "2024-04-16T00:00:00.000Z"
}
```

#### Eliminar una tarea
```http
DELETE /tasks/:id
Authorization: Bearer <token_de_acceso>
```

## Control de Acceso Basado en Roles

### Rol de Usuario (Por defecto)
- Puede crear, leer, actualizar y eliminar sus propias tareas
- Solo puede ver sus propias tareas
- Puede filtrar y paginar sus tareas

### Rol de Administrador
- Puede realizar todas las operaciones de usuario
- Puede ver todas las tareas del sistema
- Puede actualizar y eliminar cualquier tarea
- Puede filtrar y paginar todas las tareas

## Pruebas

### Pruebas Unitarias
```bash
npm run test
```

### Pruebas E2E
```bash
npm run test:e2e
```

### Pruebas de Integración
```bash
npm run test:integration
```

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
