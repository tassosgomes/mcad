export interface LogtoUser {
  id: string;
  username?: string | null;
  name?: string | null;
  primaryEmail?: string | null;
  avatar?: string | null;
  isSuspended?: boolean;
}

export interface LogtoUserImporter {
  listUsers(): Promise<LogtoUser[]>;
  getUser?(userId: string): Promise<LogtoUser | null>;
}

export interface LogtoManagementClientOptions {
  pageSize?: number;
}

export class LogtoManagementClient implements LogtoUserImporter {
  private readonly pageSize: number;

  constructor(
    private readonly managementApi: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    options: LogtoManagementClientOptions = {},
  ) {
    const pageSize = options.pageSize ?? 100;
    if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
      throw new Error('pageSize must be an integer between 1 and 100');
    }
    this.pageSize = pageSize;
  }

  async listUsers(): Promise<LogtoUser[]> {
    const token = await this.getToken();
    const collected: LogtoUser[] = [];
    let page = 1;

    while (true) {
      const batch = await this.api<LogtoUser[]>(
        `/users?page=${page}&page_size=${this.pageSize}`,
        token,
      );
      if (batch.length === 0) {
        break;
      }
      collected.push(...batch);
      if (batch.length < this.pageSize) {
        break;
      }
      page++;
    }

    return collected;
  }

  async getUser(userId: string): Promise<LogtoUser | null> {
    const token = await this.getToken();
    try {
      return await this.api<LogtoUser>(`/users/${encodeURIComponent(userId)}`, token);
    } catch (error) {
      const message = (error as Error).message ?? '';
      if (message.includes('status 404')) return null;
      throw error;
    }
  }

  private async getToken(): Promise<string> {
    const baseUrl = this.managementApi.replace(/\/api\/?$/, '');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      resource: this.managementApi,
      scope: 'all',
    });

    const response = await fetch(`${baseUrl}/oidc/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error(`Logto token request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { access_token?: string };
    if (!payload.access_token) {
      throw new Error('Logto token response missing access_token');
    }
    return payload.access_token;
  }

  private async api<T>(path: string, token: string): Promise<T> {
    const response = await fetch(`${this.managementApi.replace(/\/$/, '')}${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Logto API request failed with status ${response.status}: ${path}`);
    }
    return (await response.json()) as T;
  }
}
