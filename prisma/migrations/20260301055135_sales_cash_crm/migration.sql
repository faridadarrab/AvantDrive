-- CreateEnum
CREATE TYPE "CustomerTipo" AS ENUM ('PARTICULAR', 'EMPRESA');

-- CreateEnum
CREATE TYPE "QuoteEstado" AS ENUM ('BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "DeliveryNoteEstado" AS ENUM ('PENDIENTE', 'ENTREGADO', 'PARCIAL');

-- CreateEnum
CREATE TYPE "InvoiceEstado" AS ENUM ('EMITIDA', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "CashSessionEstado" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "CashMovementTipo" AS ENUM ('INGRESO', 'GASTO', 'COBRO_FACTURA', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "ContactTipo" AS ENUM ('CLIENTE', 'PROVEEDOR', 'PROSPECTO', 'PARTNER');

-- CreateEnum
CREATE TYPE "InteractionTipo" AS ENUM ('LLAMADA', 'EMAIL', 'REUNION', 'WHATSAPP', 'VISITA', 'OTRO');

-- CreateEnum
CREATE TYPE "ContractEstado" AS ENUM ('BORRADOR', 'ACTIVO', 'VENCIDO', 'CANCELADO', 'RENOVADO');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "nif" TEXT,
    "direccion" TEXT,
    "tipo" "CustomerTipo" NOT NULL DEFAULT 'PARTICULAR',
    "company_scope" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "estado" "QuoteEstado" NOT NULL DEFAULT 'BORRADOR',
    "valido_hasta" TIMESTAMP(3),
    "creado_por_id" UUID NOT NULL,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_notes" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "quote_id" UUID,
    "customer_id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "estado" "DeliveryNoteEstado" NOT NULL DEFAULT 'PENDIENTE',
    "creado_por_id" UUID NOT NULL,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "delivery_note_id" UUID,
    "customer_id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 21,
    "total" DOUBLE PRECISION NOT NULL,
    "estado" "InvoiceEstado" NOT NULL DEFAULT 'EMITIDA',
    "metodo_pago" TEXT,
    "creado_por_id" UUID NOT NULL,
    "approval_request_id" UUID,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "apertura_by_id" UUID NOT NULL,
    "cierre_by_id" UUID,
    "saldo_inicial" DOUBLE PRECISION NOT NULL,
    "saldo_final" DOUBLE PRECISION,
    "estado" "CashSessionEstado" NOT NULL DEFAULT 'ABIERTA',
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "tipo" "CashMovementTipo" NOT NULL,
    "concepto" TEXT NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,
    "invoice_id" UUID,
    "user_id" UUID NOT NULL,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "movil" TEXT,
    "cargo" TEXT,
    "empresa" TEXT,
    "tipo" "ContactTipo" NOT NULL DEFAULT 'PROSPECTO',
    "notas" TEXT,
    "company_scope" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "tipo" "InteractionTipo" NOT NULL,
    "asunto" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duracion_min" INTEGER,
    "resultado" TEXT,
    "user_id" UUID NOT NULL,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "valor" DOUBLE PRECISION,
    "estado" "ContractEstado" NOT NULL DEFAULT 'BORRADOR',
    "documento_url" TEXT,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "contact_id" UUID,
    "contract_id" UUID,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "company_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tags" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_company_scope_idx" ON "customers"("company_scope");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_numero_key" ON "quotes"("numero");

-- CreateIndex
CREATE INDEX "quotes_company_scope_idx" ON "quotes"("company_scope");

-- CreateIndex
CREATE INDEX "quotes_estado_idx" ON "quotes"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_notes_numero_key" ON "delivery_notes"("numero");

-- CreateIndex
CREATE INDEX "delivery_notes_company_scope_idx" ON "delivery_notes"("company_scope");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_numero_key" ON "invoices"("numero");

-- CreateIndex
CREATE INDEX "invoices_company_scope_idx" ON "invoices"("company_scope");

-- CreateIndex
CREATE INDEX "invoices_estado_idx" ON "invoices"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_numero_key" ON "cash_sessions"("numero");

-- CreateIndex
CREATE INDEX "cash_sessions_company_scope_idx" ON "cash_sessions"("company_scope");

-- CreateIndex
CREATE INDEX "cash_movements_session_id_idx" ON "cash_movements"("session_id");

-- CreateIndex
CREATE INDEX "cash_movements_company_scope_idx" ON "cash_movements"("company_scope");

-- CreateIndex
CREATE INDEX "contacts_company_scope_idx" ON "contacts"("company_scope");

-- CreateIndex
CREATE INDEX "interactions_contact_id_idx" ON "interactions"("contact_id");

-- CreateIndex
CREATE INDEX "interactions_company_scope_idx" ON "interactions"("company_scope");

-- CreateIndex
CREATE INDEX "contracts_contact_id_idx" ON "contracts"("contact_id");

-- CreateIndex
CREATE INDEX "contracts_company_scope_idx" ON "contracts"("company_scope");

-- CreateIndex
CREATE INDEX "contracts_estado_idx" ON "contracts"("estado");

-- CreateIndex
CREATE INDEX "reminders_user_id_idx" ON "reminders"("user_id");

-- CreateIndex
CREATE INDEX "reminders_company_scope_idx" ON "reminders"("company_scope");

-- CreateIndex
CREATE INDEX "tags_company_scope_idx" ON "tags"("company_scope");

-- CreateIndex
CREATE UNIQUE INDEX "tags_nombre_company_scope_key" ON "tags"("nombre", "company_scope");

-- CreateIndex
CREATE UNIQUE INDEX "contact_tags_contact_id_tag_id_key" ON "contact_tags"("contact_id", "tag_id");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "delivery_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_apertura_by_id_fkey" FOREIGN KEY ("apertura_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cierre_by_id_fkey" FOREIGN KEY ("cierre_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
