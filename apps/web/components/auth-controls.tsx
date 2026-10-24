"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthControls() {
  return (
    <div className="desk-auth-controls">
      <Show when="signed-out">
        <SignInButton mode="redirect">
          <button className="desk-sign-in">Sign in</button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <button className="desk-create-account">Create account</button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
