import LoginForm from "@/components/login-form";

// Check environment at request time so preview credentials can never leak through a promoted static build.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const allowedEnvironment = process.env.APP_ENV === "development" || process.env.APP_ENV === "staging";
  const canFillDemo = allowedEnvironment
    && process.env.VERCEL_ENV !== "production"
    && process.env.DEMO_LOGIN_ENABLED === "true"
    && process.env.DEMO_ADMIN_EMAIL === "admin@dtrminelabs.com"
    && Boolean(process.env.DEMO_ADMIN_PASSWORD);
  return <LoginForm demo={canFillDemo ? { email: process.env.DEMO_ADMIN_EMAIL!, password: process.env.DEMO_ADMIN_PASSWORD! } : null} />;
}
