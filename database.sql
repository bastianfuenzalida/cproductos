ALTER TABLE etiquetas_impresion 
ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'activo',
ADD COLUMN fecha_desactivacion DATETIME NULL; 