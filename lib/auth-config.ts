import NextAuth, { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).toLowerCase().trim();
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return null;
        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: { id?: string } }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token?.id && session.user) session.user.id = token.id as string;
      return session;
    },
  },
});