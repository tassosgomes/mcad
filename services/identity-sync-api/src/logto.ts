export interface LogtoUser {
  id: string;
  username?: string | null;
  name?: string | null;
  primaryEmail?: string | null;
  avatar?: string | null;
  isSuspended?: boolean;
  roles?: Array<string | { name?: string | null }>;
}

export interface LogtoUserImporter {
  listUsers(): Promise<LogtoUser[]>;
  getUser?(userId: string): Promise<LogtoUser | null>;
}

export class LogtoManagementClient implements LogtoUserImporter {
  constructor(
    private readonly managementApi: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async listUsers(): Promise<LogtoUser[]> {
    const token = await this.getToken();
    const users = await this.api<LogtoUser[]>('/users?limit=100', token);

    return Promise.all(
      users.map(async (user) => ({
        ...user,
        roles: await this.api<Array<{ name?: string | null }>>(
          `/users/${encodeURIComponent(user.id)}/roles`,
          token,
        ),
      })),
    );
  }

  async getUser(userId: string): Promise<LogtoUser | null> {
    const token = await this.getToken();
    try {
      const user = await this.api<LogtoUser>(`/users/${encodeURIComponent(userId)}`, token);
      const roles = await this.api<Array<{ name?: string | null }>>(
        `/users/${encodeURIComponent(userId)}/roles`,
        token,
      );
      return { ...user, roles };
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
