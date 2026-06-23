import { eq } from "drizzle-orm";
import { z } from "zod";
import { user as userTable } from "#server/db/schema";

const inputSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).default("Admin"),
});

export default defineTask({
  meta: {
    name: "create-admin",
    description: "Create an admin user via better-auth (dev only)",
  },
  async run({ payload }) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("create-admin task is disabled in production");
    }

    const parsed = inputSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${JSON.stringify(z.treeifyError(parsed.error))}`);
    }

    const existing = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, parsed.data.email))
      .limit(1);
    if (existing.length > 0) {
      throw new Error(`User already exists: ${parsed.data.email}`);
    }

    const auth = serverAuth();
    const created = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
      },
    });

    const userId = (created as { user?: { id?: string } }).user?.id;
    if (!userId) {
      throw new Error("Sign-up returned no user id");
    }

    await db.update(userTable).set({ role: "admin" }).where(eq(userTable.id, userId));

    return {
      result: createResponse(
        { code: ApiResponseCode.Success },
        { ok: true, id: userId, email: parsed.data.email, role: "admin" },
      ),
    };
  },
});
