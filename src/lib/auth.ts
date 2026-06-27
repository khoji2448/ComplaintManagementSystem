import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// import { compare } from "bcryptjs";
import { Pool } from "pg";
import { UserRoleType } from "@/types/types";
import { getPermissionsForRole } from "@/lib/roles";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const client = await pool.connect();
        try {
          const res = await client.query(
            "SELECT * FROM users WHERE email = $1",
            [credentials.email]
          );
          const user = res.rows[0];

          if (!user) {
            throw new Error("User not found");
          }

          // const isValidPassword = await compare(credentials.password, user.password); 
          const isValidPassword = credentials.password === user.password;
          if (!isValidPassword) {
            throw new Error("Invalid credentials");
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } finally {
          client.release();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as number;
        token.role = user.role;
        token.permissions = await getPermissionsForRole(user.role);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as number;
        session.user.role = token.role as UserRoleType;
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
