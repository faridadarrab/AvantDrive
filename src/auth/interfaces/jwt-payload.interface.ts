/**
 * JWT payload shape that is encoded into the access token.
 */
export interface JwtPayload {
    sub: string;        // userId
    email: string;
    companyScope: string;
    roles: string[];    // RoleName[]
    permissions: PermissionEntry[];
}

export interface PermissionEntry {
    key: string;
    scope: string;      // ScopeType
}

/**
 * Shape of the token pair returned on login / refresh.
 */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
