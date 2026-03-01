import { IsString, IsNotEmpty, IsInt, Min, IsArray, ValidateNested, IsBoolean, IsEnum, IsUrl, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// Temporarily declaring enum if Prisma Client does not export it
export enum ComponentEstado {
    OK = 'OK',
    NOT_OK = 'NOT_OK',
    NA = 'NA'
}

export class InspectionItemDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsBoolean()
    critical: boolean;

    @IsEnum(ComponentEstado)
    estado: ComponentEstado;
}

export class InspectionFotoDto {
    @IsUrl()
    url: string;
}

export class CreateInspectionDto {
    @IsInt()
    @Min(0)
    odometroKm: number;

    @IsString()
    @IsNotEmpty()
    estadoGeneral: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InspectionItemDto)
    items: InspectionItemDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InspectionFotoDto)
    @IsOptional()
    fotos?: InspectionFotoDto[];
}
