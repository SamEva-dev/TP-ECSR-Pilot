import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, throwError } from 'rxjs';
import { OidcApplicationSessionService } from './oidc-application-session.service';

/**
 * The workspace header is a selector, not a grant. Only an API-authorized
 * context may supply it, and the backend rechecks tenant and permissions.
 */
export const oidcApiInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(OidcApplicationSessionService);
  return from(session.accessTokenForApi(request.url)).pipe(switchMap(token => {
    if (!token) return next(request);
    const selected = session.bootstrapResult()?.selectedWorkspaceId;
    if (!selected || !session.ready()) return throwError(() => new Error('OIDC_WORKSPACE_REQUIRED'));
    if (request.headers.has('X-Workspace-Id') &&
        request.headers.get('X-Workspace-Id')?.toLowerCase() !== selected.toLowerCase())
      return throwError(() => new Error('OIDC_WORKSPACE_HEADER_MISMATCH'));
    if (request.headers.has('Authorization'))
      return throwError(() => new Error('OIDC_UNEXPECTED_AUTHORIZATION_HEADER'));
    return next(request.clone({ setHeaders: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': selected,
    }}));
  }));
};
