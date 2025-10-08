# Configuración de Base de Datos WMS - Supabase

Este directorio contiene todos los scripts SQL necesarios para configurar la base de datos del sistema WMS en Supabase.

## Archivos incluidos

1. **`schema.sql`** - Esquema principal de la base de datos con todas las tablas
2. **`security.sql`** - Políticas de seguridad RLS (Row Level Security)
3. **`functions.sql`** - Funciones y triggers del sistema
4. **`sample_data.sql`** - Datos de ejemplo para testing

## Instrucciones de instalación

### Paso 1: Acceder a Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto WMS

### Paso 2: Ejecutar los scripts en orden

**IMPORTANTE:** Los scripts deben ejecutarse en el siguiente orden:

#### 1. Crear el esquema de base de datos
```sql
-- Ejecutar el contenido completo de schema.sql
-- En Supabase: SQL Editor > New Query > Pegar contenido > Run
```

#### 2. Configurar seguridad RLS
```sql
-- Ejecutar el contenido completo de security.sql
-- En Supabase: SQL Editor > New Query > Pegar contenido > Run
```

#### 3. Crear funciones y triggers
```sql
-- Ejecutar el contenido completo de functions.sql
-- En Supabase: SQL Editor > New Query > Pegar contenido > Run
```

#### 4. Insertar datos de ejemplo (opcional)
```sql
-- Ejecutar el contenido completo de sample_data.sql
-- En Supabase: SQL Editor > New Query > Pegar contenido > Run
```

### Paso 3: Verificar la instalación

Después de ejecutar todos los scripts, verifica que:

1. **Tablas creadas:** Ve a Database > Tables y confirma que todas las tablas están presentes
2. **RLS habilitado:** Verifica que RLS esté habilitado en todas las tablas
3. **Funciones creadas:** Ve a Database > Functions y confirma que las funciones están presentes
4. **Datos de ejemplo:** Si ejecutaste `sample_data.sql`, verifica que hay datos en las tablas

### Estructura de tablas principales

- **profiles** - Perfiles de usuario
- **warehouses** - Almacenes
- **categories** - Categorías de productos
- **suppliers** - Proveedores
- **products** - Productos
- **locations** - Ubicaciones en almacenes
- **inventory** - Inventario actual
- **inventory_movements** - Movimientos de inventario
- **purchase_orders** - Órdenes de compra
- **sales_orders** - Órdenes de venta
- **transfers** - Transferencias entre almacenes
- **cycle_counts** - Conteos cíclicos

### Configuración de autenticación

El sistema está configurado para usar la autenticación de Supabase. Las políticas RLS garantizan que:

- Los usuarios solo pueden ver y modificar datos de su organización
- Se crean automáticamente perfiles de usuario al registrarse
- Todas las operaciones están auditadas

### Datos de ejemplo incluidos

Los datos de ejemplo incluyen:
- 5 categorías principales con subcategorías
- 4 proveedores
- 3 almacenes con ubicaciones
- 8 productos de diferentes categorías
- Inventario inicial distribuido en los almacenes
- Órdenes de compra y venta de ejemplo
- Transferencias y conteos cíclicos

### Solución de problemas

Si encuentras errores durante la instalación:

1. **Error de permisos:** Asegúrate de tener permisos de administrador en el proyecto
2. **Error de dependencias:** Ejecuta los scripts en el orden correcto
3. **Error de UUID:** Los UUIDs están predefinidos para mantener consistencia
4. **Error de RLS:** Verifica que las políticas se aplicaron correctamente

### Próximos pasos

Una vez configurada la base de datos:

1. Verifica que las variables de entorno estén configuradas correctamente en tu aplicación
2. Prueba la conexión desde la aplicación React
3. Realiza pruebas con los datos de ejemplo
4. Configura usuarios adicionales según sea necesario

## Soporte

Si necesitas ayuda adicional, revisa:
- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor](https://supabase.com/docs/guides/database/overview)