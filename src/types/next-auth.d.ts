import { DefaultSession } from "next-auth";
import { UserRoleType } from "./types";

// Extend User session type
declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      role: UserRoleType;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: number;
    role: UserRoleType;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    role: UserRoleType;
    permissions: string[];
  }
}
