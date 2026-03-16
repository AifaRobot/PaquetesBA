import { CallHandler, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class OptionalJwtInterceptor {
  constructor(private readonly jwtService: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring('Bearer '.length).trim();
      try {
        // Verify token; if invalid/expired, throw Unauthorized
        this.jwtService.verify(token);
      } catch (err) {
        throw new UnauthorizedException('Token not valid');
      }
    }

    return next.handle();
  }
}
