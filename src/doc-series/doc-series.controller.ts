import { Controller, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocSeriesService } from './doc-series.service';
import { HasPermission } from '@/auth/decorators/has-permission.decorator';

@ApiTags('doc-series')
@ApiBearerAuth()
@Controller('doc-series')
export class DocSeriesController {
    constructor(private readonly docSeriesService: DocSeriesService) { }

    @Post(':seriesId/next')
    @HasPermission('doc-series.generate', 'COMPANY')
    @ApiOperation({ summary: 'Generar siguiente número de serie documental' })
    async generateNext(@Param('seriesId') seriesId: string) {
        const number = await this.docSeriesService.generateNextNumber(seriesId);
        return { number };
    }
}
