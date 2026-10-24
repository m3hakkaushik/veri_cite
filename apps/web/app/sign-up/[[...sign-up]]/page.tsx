import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignUpPage() {
  return (
    <main id="main" className="auth-screen">
      <div className="auth-brand">
        <Logo />
      </div>
      <Suspense fallback={<p className="auth-loading">Loading sign-up…</p>}>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/app"
        />
      </Suspense>
    </main>
  );
}
