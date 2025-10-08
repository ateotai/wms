-- Crear tablas para conectores ERP
-- Este script debe ejecutarse en la consola SQL de Supabase

-- Tabla para almacenar configuraciones de conectores ERP
CREATE TABLE IF NOT EXISTS erp_connectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'sap', 'oracle', 'microsoft_dynamics', 'odoo', etc.
    endpoint VARCHAR(500) NOT NULL,
    username VARCHAR(255),
    api_key TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    sync_interval INTEGER DEFAULT 60, -- minutos
    sync_type VARCHAR(20) DEFAULT 'manual', -- 'manual' o 'automatic'
    status VARCHAR(20) DEFAULT 'inactive', -- 'active', 'inactive', 'syncing', 'error'
    last_sync TIMESTAMPTZ,
    next_sync TIMESTAMPTZ,
    records_processed INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    connection_settings JSONB DEFAULT '{}',
    inventory_mapping JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Tabla para logs de sincronización ERP
CREATE TABLE IF NOT EXISTS erp_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connector_id UUID REFERENCES erp_connectors(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- 'inventory', 'orders', 'products', etc.
    status VARCHAR(20) NOT NULL, -- 'success', 'error', 'partial'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_erp_connectors_status ON erp_connectors(status);
CREATE INDEX IF NOT EXISTS idx_erp_connectors_type ON erp_connectors(type);
CREATE INDEX IF NOT EXISTS idx_erp_connectors_is_active ON erp_connectors(is_active);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_connector_id ON erp_sync_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_started_at ON erp_sync_logs(started_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en erp_connectors
CREATE TRIGGER update_erp_connectors_updated_at 
    BEFORE UPDATE ON erp_connectors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE erp_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas (ajustar según necesidades)
CREATE POLICY "Users can view their own ERP connectors" ON erp_connectors
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own ERP connectors" ON erp_connectors
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own ERP connectors" ON erp_connectors
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own ERP connectors" ON erp_connectors
    FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Users can view sync logs for their connectors" ON erp_sync_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM erp_connectors 
            WHERE erp_connectors.id = erp_sync_logs.connector_id 
            AND erp_connectors.created_by = auth.uid()
        )
    );

CREATE POLICY "System can insert sync logs" ON erp_sync_logs
    FOR INSERT WITH CHECK (true);