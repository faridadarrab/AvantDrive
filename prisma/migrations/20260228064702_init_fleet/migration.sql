-- CreateEnum
CREATE TYPE "VehicleEstado" AS ENUM ('OPERATIVO', 'BLOQUEADO_SEGURIDAD', 'MANTENIMIENTO', 'BAJA');

-- CreateEnum
CREATE TYPE "ComponentEstado" AS ENUM ('OK', 'NOT_OK', 'NA');

-- CreateEnum
CREATE TYPE "VehicleMaintenanceEstado" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "matricula" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "estado" "VehicleEstado" NOT NULL DEFAULT 'OPERATIVO',
    "km_actual_validado" INTEGER NOT NULL DEFAULT 0,
    "operario_asignado_id" UUID,
    "company_scope" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_inspections" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "inspector_id" UUID NOT NULL,
    "odometro_km" INTEGER NOT NULL,
    "estado_general" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_odometer_logs" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "km_anterior" INTEGER NOT NULL,
    "km_nuevo" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "approval_request_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_odometer_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_logs" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "velocidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_scope" TEXT NOT NULL,

    CONSTRAINT "gps_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_maintenances" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "km_trigger" INTEGER,
    "fecha_trigger" TIMESTAMP(3),
    "estado" "VehicleMaintenanceEstado" NOT NULL DEFAULT 'PENDIENTE',
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_matricula_key" ON "vehicles"("matricula");

-- CreateIndex
CREATE INDEX "vehicles_company_scope_idx" ON "vehicles"("company_scope");

-- CreateIndex
CREATE INDEX "vehicle_inspections_company_scope_idx" ON "vehicle_inspections"("company_scope");

-- CreateIndex
CREATE INDEX "vehicle_inspections_vehicle_id_idx" ON "vehicle_inspections"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_odometer_logs_vehicle_id_idx" ON "vehicle_odometer_logs"("vehicle_id");

-- CreateIndex
CREATE INDEX "gps_logs_vehicle_id_timestamp_idx" ON "gps_logs"("vehicle_id", "timestamp");

-- CreateIndex
CREATE INDEX "gps_logs_company_scope_idx" ON "gps_logs"("company_scope");

-- CreateIndex
CREATE INDEX "vehicle_maintenances_vehicle_id_idx" ON "vehicle_maintenances"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_maintenances_company_scope_idx" ON "vehicle_maintenances"("company_scope");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_operario_asignado_id_fkey" FOREIGN KEY ("operario_asignado_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_odometer_logs" ADD CONSTRAINT "vehicle_odometer_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_odometer_logs" ADD CONSTRAINT "vehicle_odometer_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_odometer_logs" ADD CONSTRAINT "vehicle_odometer_logs_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_logs" ADD CONSTRAINT "gps_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenances" ADD CONSTRAINT "vehicle_maintenances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
