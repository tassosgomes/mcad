import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5001/api/v1';

const headers = {
  'Content-Type': 'application/json',
};

function handleResponse(res, method, path) {
  const ok = check(res, {
    [`${method} ${path} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  if (!ok) {
    console.warn(`[API] ${method} ${path} falhou: status=${res.status} body=${res.body}`);
  }
  return res;
}

export const api = {
  get(path) {
    const res = http.get(`${BASE_URL}${path}`, { headers });
    return handleResponse(res, 'GET', path);
  },

  post(path, body) {
    const res = http.post(`${BASE_URL}${path}`, JSON.stringify(body), { headers });
    return handleResponse(res, 'POST', path);
  },

  put(path, body) {
    const res = http.put(`${BASE_URL}${path}`, JSON.stringify(body), { headers });
    return handleResponse(res, 'PUT', path);
  },

  del(path) {
    const res = http.del(`${BASE_URL}${path}`, null, { headers });
    return handleResponse(res, 'DELETE', path);
  },
};
