import LoginForm from "@/components/login-form";

// Check environment at request time so preview credentials can never leak through a promoted static build.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const demoReady = process.env.DEMO_LOGIN_ENABLED === "true"
    && process.env.DEMO_ACCOUNT_READY === "true"
    && Boolean(process.env.DEMO_EMAIL)
    && Boolean(process.env.DEMO_PASSWORD);
  return <LoginForm demo={demoReady ? { email: process.env.DEMO_EMAIL!, password: process.env.DEMO_PASSWORD! } : null} />;
}
