import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";

export interface ProductAccount {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: "Active" | "Suspended";
  roles: string[];
}

export interface ProductAccountPage {
  items: ProductAccount[];
  totalCount: number;
  page: number;
  pageSize: number;
  rolesAvailable: string[];
}

@Injectable({ providedIn: "root" })
export class PedagoraAccessApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.authGateBaseUrl}/api/pedagora/access`;

  list(page: number, search = "", pageSize = 50) {
    return this.http.get<ProductAccountPage>(this.url, {
      params: new HttpParams()
        .set("page", page)
        .set("pageSize", pageSize)
        .set("search", search),
    });
  }

  setRole(userId: string, role: string) {
    return this.http.put<void>(
      `${this.url}/${encodeURIComponent(userId)}/roles`,
      { roles: [role] },
    );
  }

  setActive(userId: string, active: boolean) {
    return this.http.put<void>(
      `${this.url}/${encodeURIComponent(userId)}/status`,
      { active },
    );
  }
}
