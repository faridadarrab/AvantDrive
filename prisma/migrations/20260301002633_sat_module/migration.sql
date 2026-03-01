-- CreateEnum
CREATE TYPE "OTEstado" AS ENUM ('RECIBIDA', 'DIAGNOSTICO', 'ESPERANDO_PIEZAS', 'EN_REPARACION', 'CONTROL_CALIDAD', 'LISTA_ENTREGA', 'ENTREGADA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OTTipo" AS ENUM ('GARANTIA', 'CORRECTIVO', 'PREVENTIVO', 'INSTALACION', 'PRESUPUESTO_SOLO');

-- CreateEnum
CREATE TYPE "OTPrioridad" AS ENUM ('NORMAL', 'URGENTE', 'VIP');

-- CreateEnum
CREATE TYPE "PresupuestoEstado" AS ENUM ('BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "PagoMetodo" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE', 'CREDITO');

-- CreateEnum
CREATE TYPE "PagoEstado" AS ENUM ('PENDIENTE', 'REGISTRADO', 'ANULADO');

-- CreateTable
CREATE TABLE "ordenes_trabajo" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "OTTipo" NOT NULL DEFAULT 'CORRECTIVO',
    "estado" "OTEstado" NOT NULL DEFAULT 'RECIBIDA',
    "prioridad" "OTPrioridad" NOT NULL DEFAULT 'NORMAL',
    "cliente_nombre" TEXT NOT NULL,
    "cliente_telefono" TEXT,
    "cliente_email" TEXT,
    "equipo_descripcion" TEXT NOT NULL,
    "equipo_marca" TEXT,
    "equipo_modelo" TEXT,
    "equipo_num_serie" TEXT,
    "equipo_foto_urls" JSONB NOT NULL DEFAULT '[]',
    "falla_reportada" TEXT NOT NULL,
    "diagnostico" TEXT,
    "tecnico_id" UUID,
    "receptor_id" UUID NOT NULL,
    "contrafirma_cliente" BOOLEAN NOT NULL DEFAULT false,
    "contrafirma_fecha_hora" TIMESTAMP(3),
    "cierre_requiere_aprobacion" BOOLEAN NOT NULL DEFAULT false,
    "cierre_aprobacion_id" UUID,
    "fecha_entrada_equipo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_compromiso" TIMESTAMP(3),
    "fecha_entrega_real" TIMESTAMP(3),
    "observaciones" TEXT,
    "company_scope" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuestos" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "orden_trabajo_id" UUID NOT NULL,
    "estado" "PresupuestoEstado" NOT NULL DEFAULT 'BORRADOR',
    "valido_hasta" TIMESTAMP(3),
    "descuento_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pago_superadmin_requerido" BOOLEAN NOT NULL DEFAULT false,
    "notas_internas" TEXT,
    "notas_cliente" TEXT,
    "creado_por_id" UUID NOT NULL,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_presupuesto" (
    "id" UUID NOT NULL,
    "presupuesto_id" UUID NOT NULL,
    "concepto" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precio_unitario" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 21,
    "material_id" UUID,

    CONSTRAINT "lineas_presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resguardos_pieza" (
    "id" UUID NOT NULL,
    "orden_trabajo_id" UUID NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "valor_declarado" DOUBLE PRECISION,
    "foto_urls" JSONB NOT NULL DEFAULT '[]',
    "devuelta" BOOLEAN NOT NULL DEFAULT false,
    "fecha_devolucion" TIMESTAMP(3),
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resguardos_pieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" UUID NOT NULL,
    "orden_trabajo_id" UUID NOT NULL,
    "metodo" "PagoMetodo" NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,
    "estado" "PagoEstado" NOT NULL DEFAULT 'PENDIENTE',
    "referencia" TEXT,
    "notas" TEXT,
    "anulacion_aprobada_por_id" UUID,
    "registrado_por_id" UUID NOT NULL,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_trabajo_numero_key" ON "ordenes_trabajo"("numero");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_company_scope_idx" ON "ordenes_trabajo"("company_scope");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_estado_idx" ON "ordenes_trabajo"("estado");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_tecnico_id_idx" ON "ordenes_trabajo"("tecnico_id");

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_numero_key" ON "presupuestos"("numero");

-- CreateIndex
CREATE INDEX "presupuestos_company_scope_idx" ON "presupuestos"("company_scope");

-- CreateIndex
CREATE INDEX "presupuestos_estado_idx" ON "presupuestos"("estado");

-- CreateIndex
CREATE INDEX "lineas_presupuesto_presupuesto_id_idx" ON "lineas_presupuesto"("presupuesto_id");

-- CreateIndex
CREATE INDEX "resguardos_pieza_orden_trabajo_id_idx" ON "resguardos_pieza"("orden_trabajo_id");

-- CreateIndex
CREATE INDEX "pagos_orden_trabajo_id_idx" ON "pagos"("orden_trabajo_id");

-- CreateIndex
CREATE INDEX "pagos_company_scope_idx" ON "pagos"("company_scope");

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_receptor_id_fkey" FOREIGN KEY ("receptor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_presupuesto" ADD CONSTRAINT "lineas_presupuesto_presupuesto_id_fkey" FOREIGN KEY ("presupuesto_id") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resguardos_pieza" ADD CONSTRAINT "resguardos_pieza_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_anulacion_aprobada_por_id_fkey" FOREIGN KEY ("anulacion_aprobada_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
