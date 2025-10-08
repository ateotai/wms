# 👥 Usuarios del Sistema WMS - Gestión por Roles

## 📋 Resumen de Usuarios Creados

Este documento contiene las credenciales y especificaciones de los usuarios creados para el sistema WMS con diferentes niveles de acceso.

---

## 🔐 Credenciales de Usuarios

### 👑 ADMINISTRADORES (ADMIN)
**Acceso completo a todas las funcionalidades**

| Usuario | Email | Contraseña | Nombre Completo |
|---------|-------|------------|-----------------|
| Admin Principal | `admin@wms.com` | `Admin123!` | Administrador Principal |
| Admin Sistema | `admin.sistema@wms.com` | `AdminSys123!` | Administrador del Sistema |

**Permisos ADMIN:**
- ✅ Crear, leer, actualizar y eliminar usuarios
- ✅ Gestión completa de productos e inventario
- ✅ Configuración de almacenes y ubicaciones
- ✅ Gestión de proveedores y clientes
- ✅ Acceso a todos los reportes y analytics
- ✅ Configuración del sistema
- ✅ Gestión de roles y permisos

---

### 👨‍💼 GERENTES (MANAGER)
**Acceso a operaciones de gestión y reportes**

| Usuario | Email | Contraseña | Nombre Completo |
|---------|-------|------------|-----------------|
| Manager Operaciones | `manager.operaciones@wms.com` | `Manager123!` | Manager de Operaciones |
| Manager Inventario | `manager.inventario@wms.com` | `ManagerInv123!` | Manager de Inventario |

**Permisos MANAGER:**
- ✅ Leer usuarios (sin crear/eliminar)
- ✅ Gestión completa de productos e inventario
- ✅ Gestión de almacenes y ubicaciones
- ✅ Gestión de proveedores y clientes
- ✅ Acceso a reportes operativos
- ❌ No puede gestionar usuarios ni configuración del sistema

---

### 👷‍♂️ OPERADORES (OPERATOR)
**Acceso a operaciones operativas (recepciones, envíos)**

| Usuario | Email | Contraseña | Nombre Completo |
|---------|-------|------------|-----------------|
| Operador Recepción | `operador.recepcion@wms.com` | `Operator123!` | Operador de Recepción |
| Operador Envíos | `operador.envios@wms.com` | `OperatorShip123!` | Operador de Envíos |
| Operador Picking | `operador.picking@wms.com` | `OperatorPick123!` | Operador de Picking |

**Permisos OPERATOR:**
- ✅ Leer información de productos
- ✅ Actualizar inventario (recepciones, movimientos)
- ✅ Leer información de almacenes
- ✅ Gestionar recepciones y envíos
- ✅ Acceso a reportes básicos de inventario
- ❌ No puede crear/eliminar productos
- ❌ No puede gestionar usuarios, proveedores o clientes

---

### 👀 VISUALIZADORES (VIEWER)
**Acceso solo de lectura**

| Usuario | Email | Contraseña | Nombre Completo |
|---------|-------|------------|-----------------|
| Auditor | `auditor@wms.com` | `Viewer123!` | Auditor del Sistema |
| Consultor | `consultor@wms.com` | `Consultor123!` | Consultor Externo |

**Permisos VIEWER:**
- ✅ Solo lectura de usuarios
- ✅ Solo lectura de productos e inventario
- ✅ Solo lectura de almacenes y ubicaciones
- ✅ Solo lectura de proveedores y clientes
- ✅ Acceso a reportes de solo lectura
- ❌ No puede crear, actualizar o eliminar nada

---

## 🚀 Instrucciones de Ejecución

### Paso 1: Preparar la Base de Datos
```sql
-- 1. Ejecutar primero el script de roles (si no se ha hecho)
\i database/roles_incremental_update.sql
```

### Paso 2: Crear los Usuarios
```sql
-- 2. Ejecutar el script de creación de usuarios
\i database/create_users_by_roles.sql
```

### Paso 3: Verificar la Creación
```sql
-- 3. Verificar que los usuarios se crearon correctamente
SELECT 
    role,
    COUNT(*) as total_usuarios,
    string_agg(email, ', ') as emails
FROM profiles 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY 
    CASE role
        WHEN 'ADMIN' THEN 1
        WHEN 'MANAGER' THEN 2
        WHEN 'OPERATOR' THEN 3
        WHEN 'VIEWER' THEN 4
    END;
```

---

## 🔧 Funciones Disponibles

### `create_wms_users()`
Crea todos los usuarios con sus respectivos roles y permisos.

```sql
SELECT create_wms_users();
```

### `cleanup_test_users()` (Opcional)
Elimina todos los usuarios de prueba creados.

```sql
SELECT cleanup_test_users();
```

---

## 📊 Distribución de Usuarios

| Rol | Cantidad | Porcentaje |
|-----|----------|------------|
| ADMIN | 2 | 22% |
| MANAGER | 2 | 22% |
| OPERATOR | 3 | 33% |
| VIEWER | 2 | 22% |
| **TOTAL** | **9** | **100%** |

---

## 🛡️ Seguridad y Mejores Prácticas

### 🔒 Contraseñas
- Todas las contraseñas siguen el patrón: `[Rol][Descripción]123!`
- **IMPORTANTE:** Cambiar las contraseñas en producción
- Las contraseñas están encriptadas con bcrypt

### 🔐 Autenticación
- Todos los usuarios están confirmados por email
- Cuentas activas por defecto
- Integración completa con Supabase Auth

### 🛠️ Mantenimiento
- Los usuarios pueden ser desactivados cambiando `is_active` a `false`
- Los roles pueden ser modificados actualizando la columna `role`
- Las fechas de `last_login` se actualizan automáticamente

---

## 🧪 Casos de Uso de Prueba

### Escenario 1: Login como Admin
```
Email: admin@wms.com
Password: Admin123!
Resultado: Acceso completo al sistema
```

### Escenario 2: Login como Manager
```
Email: manager.operaciones@wms.com
Password: Manager123!
Resultado: Acceso a gestión y reportes
```

### Escenario 3: Login como Operator
```
Email: operador.recepcion@wms.com
Password: Operator123!
Resultado: Acceso a operaciones de recepción
```

### Escenario 4: Login como Viewer
```
Email: auditor@wms.com
Password: Viewer123!
Resultado: Solo lectura del sistema
```

---

## 📝 Notas Importantes

1. **Primer Usuario Admin**: El sistema asigna automáticamente el rol ADMIN al primer usuario registrado
2. **RLS Activado**: Todas las tablas tienen Row Level Security habilitado
3. **Permisos Granulares**: Cada rol tiene permisos específicos definidos en `role_permissions`
4. **Funciones de Verificación**: Usa `check_user_permission()` para validar accesos
5. **Auditoría**: Todas las acciones quedan registradas con timestamps

---

## 🔄 Próximos Pasos

1. **Ejecutar Scripts**: Aplicar los scripts en Supabase
2. **Probar Login**: Verificar que cada usuario puede autenticarse
3. **Validar Permisos**: Confirmar que los permisos funcionan correctamente
4. **Integrar Frontend**: Conectar con la aplicación React
5. **Personalizar**: Ajustar roles y permisos según necesidades específicas

---

*Documento generado automáticamente para el Sistema WMS*  
*Fecha: $(date)*  
*Versión: 1.0*