-- CreateEnum
CREATE TYPE "LocationTipo" AS ENUM ('ALMACEN', 'VEHICULO', 'OBRA');

-- CreateEnum
CREATE TYPE "ToolEstado" AS ENUM ('DISPONIBLE', 'ASIGNADA', 'MANTENIMIENTO', 'DANADA', 'BAJA');

-- CreateEnum
CREATE TYPE "ToolMovementTipo" AS ENUM ('RETIRADA', 'DEVOLUCION', 'TRASLADO', 'BAJA');

-- CreateEnum
CREATE TYPE "Gremio" AS ENUM ('ELECTRONICA', 'ELECTRICIDAD', 'FONTANERIA', 'ELECTRODOMESTICOS', 'PINTURA', 'ALBANILERIA', 'CARPINTERIA');

-- CreateEnum
CREATE TYPE "MaterialMovementTipo" AS ENUM ('ENTRADA', 'SALIDA', 'ASIGNACION', 'DEVOLUCION', 'AJUSTE');

-- CreateEnum
CREATE TYPE "SolicitudTipo" AS ENUM ('REPOSICION', 'DEVOLUCION', 'TRASLADO', 'BAJA');

-- CreateEnum
CREATE TYPE "SolicitudPrioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "SolicitudEstado" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'EJECUTADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "IncidenciaTipo" AS ENUM ('DANO', 'PERDIDA', 'ROBO', 'DEFECTO', 'OTRO');

-- CreateEnum
CREATE TYPE "IncidenciaEstado" AS ENUM ('ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA');

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "LocationTipo" NOT NULL,
    "vehiculo_id" UUID,
    "company_scope" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "qr_code" TEXT NOT NULL,
    "estado" "ToolEstado" NOT NULL DEFAULT 'DISPONIBLE',
    "location_id" UUID NOT NULL,
    "precio_compra" DOUBLE PRECISION,
    "valor_actual" DOUBLE PRECISION,
    "proveedor" TEXT,
    "proximo_mantenimiento" TIMESTAMP(3),
    "numero_serie" TEXT,
    "company_scope" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_movements" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "tipo" "ToolMovementTipo" NOT NULL,
    "location_origen_id" UUID,
    "location_destino_id" UUID,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "work_order_id" UUID,
    "solicitud_id" UUID,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_kits" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "gremio" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_kit_items" (
    "id" UUID NOT NULL,
    "kit_id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tool_kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "gremio" "Gremio" NOT NULL,
    "categoria" TEXT,
    "codigo_ref" TEXT,
    "unidad" TEXT NOT NULL,
    "stock_actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock_minimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precio_unitario_compra" DOUBLE PRECISION NOT NULL,
    "precio_unitario_venta" DOUBLE PRECISION,
    "proveedor" TEXT,
    "qr_code" TEXT NOT NULL,
    "location_id" UUID NOT NULL,
    "company_scope" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_movements" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "tipo" "MaterialMovementTipo" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "operario_destino_id" UUID,
    "work_order_id" UUID,
    "solicitud_id" UUID,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location_id" UUID NOT NULL,

    CONSTRAINT "material_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_workflows" (
    "id" UUID NOT NULL,
    "tipo" "SolicitudTipo" NOT NULL,
    "creado_por_id" UUID NOT NULL,
    "furgoneta_id" UUID,
    "items" JSONB NOT NULL,
    "motivo" TEXT,
    "prioridad" "SolicitudPrioridad" NOT NULL DEFAULT 'MEDIA',
    "estado" "SolicitudEstado" NOT NULL DEFAULT 'PENDIENTE',
    "aprobado_por_id" UUID,
    "notas_supervisor" TEXT,
    "confirmado_receptor" BOOLEAN NOT NULL DEFAULT false,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitud_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencias" (
    "id" UUID NOT NULL,
    "tipo" "IncidenciaTipo" NOT NULL,
    "tool_id" UUID,
    "material_id" UUID,
    "operario_id" UUID NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" "SolicitudPrioridad" NOT NULL,
    "estado" "IncidenciaEstado" NOT NULL DEFAULT 'ABIERTA',
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_company_scope_idx" ON "locations"("company_scope");

-- CreateIndex
CREATE UNIQUE INDEX "tools_qr_code_key" ON "tools"("qr_code");

-- CreateIndex
CREATE INDEX "tools_company_scope_idx" ON "tools"("company_scope");

-- CreateIndex
CREATE INDEX "tools_estado_idx" ON "tools"("estado");

-- CreateIndex
CREATE INDEX "tool_movements_tool_id_idx" ON "tool_movements"("tool_id");

-- CreateIndex
CREATE INDEX "tool_movements_company_scope_idx" ON "tool_movements"("company_scope");

-- CreateIndex
CREATE INDEX "tool_kits_company_scope_idx" ON "tool_kits"("company_scope");

-- CreateIndex
CREATE UNIQUE INDEX "tool_kit_items_kit_id_tool_id_key" ON "tool_kit_items"("kit_id", "tool_id");

-- CreateIndex
CREATE UNIQUE INDEX "materials_qr_code_key" ON "materials"("qr_code");

-- CreateIndex
CREATE INDEX "materials_company_scope_idx" ON "materials"("company_scope");

-- CreateIndex
CREATE INDEX "materials_gremio_idx" ON "materials"("gremio");

-- CreateIndex
CREATE INDEX "material_movements_material_id_idx" ON "material_movements"("material_id");

-- CreateIndex
CREATE INDEX "material_movements_company_scope_idx" ON "material_movements"("company_scope");

-- CreateIndex
CREATE INDEX "solicitud_workflows_company_scope_idx" ON "solicitud_workflows"("company_scope");

-- CreateIndex
CREATE INDEX "solicitud_workflows_estado_idx" ON "solicitud_workflows"("estado");

-- CreateIndex
CREATE INDEX "solicitud_workflows_prioridad_idx" ON "solicitud_workflows"("prioridad");

-- CreateIndex
CREATE INDEX "incidencias_company_scope_idx" ON "incidencias"("company_scope");

-- CreateIndex
CREATE INDEX "incidencias_estado_idx" ON "incidencias"("estado");

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_movements" ADD CONSTRAINT "tool_movements_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_movements" ADD CONSTRAINT "tool_movements_location_origen_id_fkey" FOREIGN KEY ("location_origen_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_movements" ADD CONSTRAINT "tool_movements_location_destino_id_fkey" FOREIGN KEY ("location_destino_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_movements" ADD CONSTRAINT "tool_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_kit_items" ADD CONSTRAINT "tool_kit_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "tool_kits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_kit_items" ADD CONSTRAINT "tool_kit_items_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_operario_destino_id_fkey" FOREIGN KEY ("operario_destino_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_workflows" ADD CONSTRAINT "solicitud_workflows_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_workflows" ADD CONSTRAINT "solicitud_workflows_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_workflows" ADD CONSTRAINT "solicitud_workflows_furgoneta_id_fkey" FOREIGN KEY ("furgoneta_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_operario_id_fkey" FOREIGN KEY ("operario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
