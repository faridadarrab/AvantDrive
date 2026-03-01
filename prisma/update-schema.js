const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('vehiculosAsignados')) {
    schema = schema.replace(/model User \{/, `model User {
  vehiculosAsignados    Vehicle[]              @relation("VehicleAsignado")
  inspeccionesRealizadas VehicleInspection[]   @relation("VehicleInspector")
  odometerLogs          VehicleOdometerLog[]   @relation("OdometerUser")
`);
}

if (!schema.includes('odometerLogs VehicleOdometerLog[]')) {
    schema = schema.replace(/model ApprovalRequest \{/, `model ApprovalRequest {
  odometerLogs          VehicleOdometerLog[]
`);
}

const fleetModels = `

// ---------------- FLEET ----------------

enum VehicleEstado {
  OPERATIVO
  BLOQUEADO_SEGURIDAD
  MANTENIMIENTO
  BAJA
}

enum ComponentEstado {
  OK
  NOT_OK
  NA
}

enum VehicleMaintenanceEstado {
  PENDIENTE
  EN_CURSO
  COMPLETADO
  CANCELADO
}

model Vehicle {
  id                 String    @id @default(uuid()) @db.Uuid
  matricula          String    @unique
  marca              String
  modelo             String
  anio               Int       @map("ano") // avoid ñ
  estado             VehicleEstado @default(OPERATIVO)
  kmActualValidado   Int       @default(0) @map("km_actual_validado")
  operarioAsignadoId String?   @map("operario_asignado_id") @db.Uuid
  companyScope       String    @map("company_scope")
  deletedAt          DateTime? @map("deleted_at")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  operarioAsignado   User?     @relation("VehicleAsignado", fields: [operarioAsignadoId], references: [id])
  inspections        VehicleInspection[]
  odometerLogs       VehicleOdometerLog[]
  gpsLogs            GpsLog[]
  maintenances       VehicleMaintenance[]

  @@index([companyScope])
  @@map("vehicles")
}

model VehicleInspection {
  id             String    @id @default(uuid()) @db.Uuid
  vehicleId      String    @map("vehicle_id") @db.Uuid
  inspectorId    String    @map("inspector_id") @db.Uuid
  odometroKm     Int       @map("odometro_km")
  estadoGeneral  String    @map("estado_general")
  items          Json      // [{nombre, critical, estado: OK|NOT_OK|NA}]
  fotos          Json      @default("[]") // [{url}]
  fecha          DateTime  @default(now())
  companyScope   String    @map("company_scope")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  vehicle        Vehicle   @relation(fields: [vehicleId], references: [id])
  inspector      User      @relation("VehicleInspector", fields: [inspectorId], references: [id])

  @@index([companyScope])
  @@index([vehicleId])
  @@map("vehicle_inspections")
}

model VehicleOdometerLog {
  id                 String    @id @default(uuid()) @db.Uuid
  vehicleId          String    @map("vehicle_id") @db.Uuid
  kmAnterior         Int       @map("km_anterior")
  kmNuevo            Int       @map("km_nuevo")
  locked             Boolean   @default(false)
  fecha              DateTime  @default(now())
  userId             String    @map("user_id") @db.Uuid
  approvalRequestId  String?   @map("approval_request_id") @db.Uuid
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  vehicle            Vehicle   @relation(fields: [vehicleId], references: [id])
  user               User      @relation("OdometerUser", fields: [userId], references: [id])
  approvalRequest    ApprovalRequest? @relation(fields: [approvalRequestId], references: [id])

  @@index([vehicleId])
  @@map("vehicle_odometer_logs")
}

model GpsLog {
  id             String    @id @default(uuid()) @db.Uuid
  vehicleId      String    @map("vehicle_id") @db.Uuid
  lat            Float
  lon            Float
  velocidad      Float     @default(0)
  timestamp      DateTime  @default(now())
  companyScope   String    @map("company_scope")

  vehicle        Vehicle   @relation(fields: [vehicleId], references: [id])

  @@index([vehicleId, timestamp])
  @@index([companyScope])
  @@map("gps_logs")
}

model VehicleMaintenance {
  id             String    @id @default(uuid()) @db.Uuid
  vehicleId      String    @map("vehicle_id") @db.Uuid
  tipo           String    // e.g. "PREVENTIVO", "CORRECTIVO"
  descripcion    String
  kmTrigger      Int?      @map("km_trigger")
  fechaTrigger   DateTime? @map("fecha_trigger")
  estado         VehicleMaintenanceEstado @default(PENDIENTE)
  companyScope   String    @map("company_scope")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  vehicle        Vehicle   @relation(fields: [vehicleId], references: [id])

  @@index([vehicleId])
  @@index([companyScope])
  @@map("vehicle_maintenances")
}
`;

if (!schema.includes('model Vehicle {')) {
    schema += fleetModels;
}

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('Update finished.');
