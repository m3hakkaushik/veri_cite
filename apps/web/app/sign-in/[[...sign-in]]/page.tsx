import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignInPage() {
  return (
    <main id="main" className="auth-screen">
      <div className="auth-brand">
        <Logo />
      </div>
      <Suspense fallback={<p className="auth-loading">Loading sign-in…</p>}>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/app"
        />
      </Suspense>
    </main>
  );
}
