import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateGpsLogDto {
    @IsNumber()
    @IsNotEmpty()
    lat: number;

    @IsNumber()
    @IsNotEmpty()
    lon: number;

    @IsNumber()
    @IsNotEmpty()
    velocidad: number;
}
