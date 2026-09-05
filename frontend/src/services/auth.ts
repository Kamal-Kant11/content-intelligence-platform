import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  User,
  ValidationErrorItem,
} from '../types/auth';

const TOKEN_KEY = 'cip_access_token';

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore write errors (e.g. private browsing storage restrictions)
    }
  },
  remove: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore removal errors
    }
  },
};

export class ApiError extends Error {
  statusCode: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, statusCode: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  let responseData: unknown = null;
  try {
    responseData = await response.json();
  } catch {
    // Response body is not JSON
  }

  const statusCode = response.status;

  if (statusCode === 401) {
    const detail = (responseData as { detail?: string })?.detail;
    const message = detail === 'Invalid or expired token' || detail === 'Invalid token'
      ? 'Session expired or invalid. Please log in again.'
      : 'Invalid email or password';
    throw new ApiError(message, 401);
  }

  if (statusCode === 409) {
    const detail = (responseData as { detail?: string })?.detail;
    throw new ApiError(detail || 'Email is already registered', 409);
  }

  if (statusCode === 422) {
    const details = (responseData as { detail?: ValidationErrorItem[] })?.detail;
    const fieldErrors: Record<string, string> = {};
    const messages: string[] = [];

    if (Array.isArray(details)) {
      for (const err of details) {
        const field = err.loc && err.loc.length > 1 ? String(err.loc[err.loc.length - 1]) : 'field';
        const cleanMsg = err.msg.replace(/^Value error,\s*/i, '');
        fieldErrors[field] = cleanMsg;
        messages.push(`${field}: ${cleanMsg}`);
      }
    }

    const summaryMessage = messages.length > 0
      ? messages.join('. ')
      : 'Validation error. Please verify the submitted data.';

    throw new ApiError(summaryMessage, 422, fieldErrors);
  }

  const genericDetail = (responseData as { detail?: string })?.detail;
  throw new ApiError(
    genericDetail || 'Unable to connect to the server. Please try again.',
    statusCode
  );
}

// Frontend request paths: /auth/login, /auth/register, /auth/me (routed via Vite proxy or direct)
const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse<LoginResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError('Unable to connect to the server. Please try again.', 0);
  }
}

export async function registerApi(payload: RegisterPayload): Promise<User> {
  try {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse<User>(response);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError('Unable to connect to the server. Please try again.', 0);
  }
}

export async function getMeApi(token: string): Promise<User> {
  try {
    const response = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await handleResponse<User>(response);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError('Unable to connect to the server. Please try again.', 0);
  }
}
