import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  sort?: string; // e.g. "createdAt"

  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc';
}

export class PaginationMetaDto {
  @Expose()
  page!: number;

  @Expose()
  limit!: number;

  @Expose()
  total!: number;

  @Expose()
  pages!: number;
}

// Generic Prisma pagination helper
// Usage: prismaPaginate(prisma.user, { where, include, orderBy, omit }, { page, limit })
export async function prismaPaginate<T>(
  model: any,
  options: {
    where?: any;
    select?: any;
    include?: any;
    omit?: any;
    orderBy?: any;
  },
  query: { page?: number; limit?: number },
): Promise<{ items: T[]; pagination: PaginationMetaDto }> {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const skip = (page - 1) * limit;

  const { where, select, include, omit, orderBy } = options;

  const findArgs: any = { where, skip, take: limit, orderBy };
  if (select) findArgs.select = select;
  if (include) findArgs.include = include;
  if (omit) findArgs.omit = omit;

  const [rows, total] = await Promise.all([
    model.findMany(findArgs),
    model.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    items: rows as T[],
    pagination: { page, limit, total, pages },
  };
}
