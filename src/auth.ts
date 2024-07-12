import NextAuth from "next-auth";
import AuthConfig from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth(AuthConfig);
