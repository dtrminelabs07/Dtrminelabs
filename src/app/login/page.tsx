import LoginForm from "@/components/login-form";

// Check environment at request time so preview credentials can never leak through a promoted static build.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}

