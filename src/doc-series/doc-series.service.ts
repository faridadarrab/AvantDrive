import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DocSeriesService {
    private readonly logger = new Logger(DocSeriesService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate the next document number for a given series.
     *
     * Uses a Prisma $transaction with raw SQL SELECT FOR UPDATE
     * to guarantee atomic, gap-free numbering even under concurrent access.
     *
     * @returns formatted string like "OT-2026-000001"
     */
    async generateNextNumber(seriesId: string): Promise<string> {
        return this.prisma.$transaction(async (tx) => {
            // 1. Get the series definition
            const series = await tx.documentSeries.findUnique({
                where: { id: seriesId },
            });

            if (!series || !series.activo) {
                throw new NotFoundException(
                    `Serie documental ${seriesId} no encontrada o inactiva`,
                );
            }

            // 2. Determine the periodo key
            const periodoKey = this.getPeriodoKey(series.periodo);

            // 3. Atomic SELECT FOR UPDATE on the counter row
            const result = await tx.$queryRawUnsafe<
                Array<{ id: string; siguiente_numero: number }>
            >(
                `SELECT id, siguiente_numero
         FROM document_counters
         WHERE series_id = $1 AND periodo_key = $2
         FOR UPDATE`,
                seriesId,
                periodoKey,
            );

            let nextNumber: number;
            let counterId: string;

            if (result.length === 0) {
                // First document in this period — create counter
                const newCounter = await tx.documentCounter.create({
                    data: {
                        seriesId,
                        periodoKey,
                        siguienteNumero: 2, // Next after this one
                    },
                });
                counterId = newCounter.id;
                nextNumber = 1;
            } else {
                counterId = result[0].id;
                nextNumber = result[0].siguiente_numero;

                // Increment for next call
                await tx.$executeRawUnsafe(
                    `UPDATE document_counters
           SET siguiente_numero = siguiente_numero + 1
           WHERE id = $1`,
                    counterId,
                );
            }

            // 4. Format the number
            const paddedNumber = String(nextNumber).padStart(series.padding, '0');

            // 5. Build the final document number based on periodo
            let formatted: string;
            if (series.periodo === 'NINGUNO') {
                formatted = `${series.prefijo}-${paddedNumber}`;
            } else {
                const year = new Date().getFullYear().toString();
                formatted = `${series.prefijo}-${year}-${paddedNumber}`;
            }

            this.logger.log(`Generated document number: ${formatted}`);
            return formatted;
        });
    }

    /**
     * Get the periodo key based on the series configuration.
     */
    private getPeriodoKey(
        periodo: string,
    ): string {
        const now = new Date();
        switch (periodo) {
            case 'ANUAL':
                return now.getFullYear().toString();
            case 'MENSUAL':
                return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            case 'NINGUNO':
                return 'ALL';
            default:
                return now.getFullYear().toString();
        }
    }
}
