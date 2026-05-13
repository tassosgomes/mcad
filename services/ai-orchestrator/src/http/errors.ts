export class HttpProblemError extends Error {
  readonly status: number;
  readonly title: string;
  readonly type: string;

  constructor(status: number, title: string, detail: string) {
    super(detail);
    this.name = 'HttpProblemError';
    this.status = status;
    this.title = title;
    this.type = `https://mcad.local/problems/${title.toLowerCase().replaceAll(' ', '-')}`;
  }
}

export class UnauthorizedError extends HttpProblemError {
  constructor(detail = 'Authentication is required.') {
    super(401, 'Unauthorized', detail);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpProblemError {
  constructor(detail = 'The user is not allowed to access this resource.') {
    super(403, 'Forbidden', detail);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends HttpProblemError {
  constructor(detail = 'The request payload is invalid.') {
    super(422, 'Validation Error', detail);
    this.name = 'ValidationError';
  }
}

export class UpstreamError extends HttpProblemError {
  readonly upstreamStatus: number;

  constructor(upstreamStatus: number, detail = 'The upstream service returned an error.') {
    super(502, 'Upstream Error', detail);
    this.name = 'UpstreamError';
    this.upstreamStatus = upstreamStatus;
  }
}
