# 🔧 Solución al Error de Roles - WMS Database

## ❌ Error Encontrado
```
ERROR: 42701: column "role" of relation "profiles" already exists
```

Este error indica que algunos componentes del sistema de roles ya fueron creados previamente en tu base de datos.

## ✅ Solución Implementada

He creado scripts incrementales que verifican qué componentes existen antes de crearlos, evitando conflictos.

### 📁 Archivos Creados

1. **`check_database_state.sql`** - Verifica el estado actual de la base de datos
2. **`roles_incremental_update.sql`** - Actualización incremental segura
3. **`README_roles_fix.md`** - Esta documentación

## 🚀 Instrucciones de Ejecución

### Paso 1: Verificar Estado Actual
```sql
-- Ejecuta este script para ver qué componentes ya existen
\i database/check_database_state.sql
```

### Paso 2: Aplicar Actualización Incremental
```sql
-- Este script solo agregará los componentes faltantes
\i database/roles_incremental_update.sql
```

### Paso 3: Crear Usuarios de Ejemplo (Opcional)
```sql
-- Solo si necesitas usuarios de prueba
\i database/sample_users.sql
```

## 🔍 Qué Hace el Script Incremental

El script `roles_incremental_update.sql` verifica cada componente antes de crearlo:

### ✅ Componentes Verificados:
- **Enum `user_role`** - Solo se crea si no existe
- **Columnas en `profiles`** - Solo agrega las columnas faltantes:
  - `role` (user_role)
  - `permissions` (JSONB)
  - `is_active` (BOOLEAN)
  - `last_login` (TIMESTAMPTZ)
  - `created_by` (UUID)
- **Tabla `role_permissions`** - Solo se crea si no existe
- **Índices** - Solo se crean si no existen
- **Funciones** - Se crean/actualizan siempre (usando `CREATE OR REPLACE`)
- **Triggers** - Solo se crean si no existen
- **Políticas RLS** - Se eliminan y recrean para asegurar consistencia
- **Vistas** - Se crean/actualizan siempre (usando `CREATE OR REPLACE`)

### 📊 Permisos por Rol:

| Rol | Descripción | Permisos Principales |
|-----|-------------|---------------------|
| **ADMIN** | Acceso completo | Todos los recursos (CRUD completo) |
| **MANAGER** | Gestión y reportes | Gestión de productos, órdenes, reportes |
| **OPERATOR** | Operaciones | Inventario, recepciones, envíos |
| **VIEWER** | Solo lectura | Visualización de datos, reportes básicos |

## 🛠️ Funciones Disponibles

### Verificar Permisos
```sql
SELECT check_user_permission(
    'user-uuid-here',
    'products',
    'create'
);
```

### Obtener Permisos de Usuario
```sql
SELECT * FROM get_user_permissions('user-uuid-here');
```

### Consultar Usuarios con Roles
```sql
SELECT * FROM user_roles_view;
```

### Estadísticas por Rol
```sql
SELECT * FROM user_stats_by_role;
```

## 🔐 Seguridad RLS

Las políticas de Row Level Security están configuradas para:
- Los usuarios solo pueden ver su propio perfil o si tienen permiso `users.read`
- Solo usuarios con permiso `users.update` pueden modificar otros perfiles
- Solo usuarios con permiso `users.create` pueden crear nuevos usuarios
- El primer usuario registrado automáticamente recibe rol `ADMIN`

## ⚠️ Notas Importantes

1. **Backup**: Siempre haz un backup antes de ejecutar scripts de base de datos
2. **Orden**: Ejecuta los scripts en el orden indicado
3. **Verificación**: Usa `check_database_state.sql` para verificar el estado
4. **Logs**: El script incremental muestra mensajes informativos sobre qué se crea/omite

## 🆘 Troubleshooting

### Si sigues teniendo errores:
1. Verifica que tienes permisos de administrador en Supabase
2. Asegúrate de que la función `update_updated_at_column()` existe (del script `functions.sql`)
3. Revisa los logs de Supabase para errores específicos

### Para resetear completamente el sistema de roles:
```sql
-- ⚠️ CUIDADO: Esto eliminará todos los datos de roles
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS permissions,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS last_login,
  DROP COLUMN IF EXISTS created_by;
```

## 📞 Soporte

Si necesitas ayuda adicional, proporciona:
1. El resultado de `check_database_state.sql`
2. Los mensajes de error específicos
3. La versión de PostgreSQL que estás usando

---
*Generado automáticamente para resolver el conflicto de columnas en el sistema de roles WMS*