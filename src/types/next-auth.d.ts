import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    firmId: string;
    firmSlug: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      firmId: string;
      // Slug for the firm's tenant subdomain (<slug>.riftira.com). Stored on
      // the JWT so the post-login redirect doesn't need an extra DB round-trip.
      // May go stale if an admin renames the slug in Settings — that admin
      // will see the new slug after their next sign-in.
      firmSlug: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    firmId?: string;
    firmSlug?: string;
    role?: string;
  }
}
