import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Optional,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { stripSecrets } from '../common/utils/secret-stripper';

export interface PHIInterceptorOptions {
  action: 'PATIENT_VIEW' | 'PATIENT_EXPORT' | 'PATIENT_SEARCH';
  auditableType?: string;
  extractEntityId?: (req: Request, data: any) => string;
}

@Injectable()
export class PHIInterceptor implements NestInterceptor {
  private readonly options: PHIInterceptorOptions;

  constructor(
    @Inject(AuditService) private readonly auditService: AuditService,
    @Optional() @Inject('PHI_OPTIONS') options?: PHIInterceptorOptions,
  ) {
    this.options = options || { action: 'PATIENT_VIEW', auditableType: 'Patient' };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap((data) => {
        // Fire audit log asynchronously
        let entityId = 'MULTIPLE';
        if (this.options.extractEntityId) {
          entityId = this.options.extractEntityId(request, data);
        } else if (request.params?.id) {
          entityId = Array.isArray(request.params.id) ? request.params.id[0] : String(request.params.id);
        } else if (data && typeof data === 'object' && 'id' in data) {
          entityId = String(data.id);
        }

        const safeSnapshot = stripSecrets({
          endpoint: request.originalUrl,
          method: request.method,
          query: request.query,
          params: request.params,
          recordCount: Array.isArray(data) ? data.length : 1,
        });

        this.auditService.log({
          userId: user?.id ?? null,
          action: this.options.action,
          auditableType: this.options.auditableType || 'Patient',
          auditableId: entityId,
          newValues: safeSnapshot as Record<string, unknown>,
          ipAddress: ip,
          userAgent,
        }).catch((err) => {
          console.error('[PHIInterceptor] Failed to log PHI read:', err);
        });
      }),
    );
  }
}
