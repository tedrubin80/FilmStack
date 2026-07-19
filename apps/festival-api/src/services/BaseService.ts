import { PrismaClient } from '@prisma/client';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import { NotFoundError, DatabaseError } from '../utils/ApiError';

/**
 * Base Service Class
 * Provides common functionality for all services
 */
export abstract class BaseService {
  protected prisma: PrismaClient;
  protected logger = logger;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Wraps database operations with error handling
   */
  protected async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    errorMessage = 'Database operation failed'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`${errorMessage}:`, error);
      throw new DatabaseError(errorMessage, error);
    }
  }

  /**
   * Finds a resource or throws NotFoundError
   */
  protected async findOrFail<T>(
    findOperation: () => Promise<T | null>,
    resourceName: string,
    id?: string | number
  ): Promise<T> {
    const result = await findOperation();
    if (!result) {
      throw new NotFoundError(resourceName, id);
    }
    return result;
  }

  /**
   * Validates tenant ownership of a resource
   */
  protected validateTenantOwnership(resourceTenantId: number, requestTenantId: number): void {
    if (resourceTenantId !== requestTenantId) {
      throw new NotFoundError('Resource');
    }
  }

  /**
   * Paginate results
   */
  protected calculatePagination(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Build where clause for search
   */
  protected buildSearchWhere(search: string | undefined, fields: string[]) {
    if (!search) {
      return {};
    }

    return {
      OR: fields.map((field) => ({
        [field]: {
          contains: search,
          mode: 'insensitive' as const,
        },
      })),
    };
  }

  /**
   * Sanitize update data (remove undefined values)
   */
  protected sanitizeUpdateData<T extends Record<string, any>>(data: T): Partial<T> {
    const sanitized: Partial<T> = {};
    for (const key in data) {
      if (data[key] !== undefined) {
        sanitized[key] = data[key];
      }
    }
    return sanitized;
  }
}
