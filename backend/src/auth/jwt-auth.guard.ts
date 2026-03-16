import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth: string = req.headers?.authorization || '';

    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : undefined;
    if (!token) throw new UnauthorizedException('Missing Bearer token');

    try {
      const payload = await this.jwt.verifyAsync(token);
      req.user = payload; // attach decoded payload
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
