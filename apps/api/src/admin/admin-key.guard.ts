import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey) {
      throw new ServiceUnavailableException("A chave administrativa ainda não foi configurada.");
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const header = request.headers["x-admin-key"];
    const receivedKey = Array.isArray(header) ? header[0] : header;

    if (!receivedKey || !this.safeCompare(receivedKey, expectedKey)) {
      throw new UnauthorizedException("Acesso administrativo não autorizado.");
    }

    return true;
  }

  private safeCompare(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }
}
