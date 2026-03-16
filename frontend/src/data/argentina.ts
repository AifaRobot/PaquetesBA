import data from './argentina.json';

export interface Province {
  id: string;
  nombre: string;
}

export const provinces: Province[] = data.provinces as Province[];

export const citiesByProvince: Record<string, string[]> =
  data.citiesByProvince as Record<string, string[]>;

export function getCitiesForProvince(provinceId: string): string[] {
  return citiesByProvince[provinceId] ?? [];
}

export function getProvinceByName(nombre: string): Province | undefined {
  return provinces.find((p) => p.nombre === nombre);
}
