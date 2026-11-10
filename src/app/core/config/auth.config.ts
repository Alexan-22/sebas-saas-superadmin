export interface AuthEndpoints {
  login: string;
  perfil: string;
}

export const AUTH_ENDPOINTS: AuthEndpoints = {
  login: '/api/auth/superadmin/login',
  perfil: '/api/superadmin/me'
};