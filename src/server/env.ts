export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_TIME_ZONE?: string;
  BOOTSTRAP_SECRET?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "SCANNER" | "VIEWER";
};

export type AppVariables = {
  authUser: AuthUser;
};
