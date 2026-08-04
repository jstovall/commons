import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <span className="commons-heading mb-1 self-center text-4xl">commons</span>
      <div className="commons-card-flat mt-4 p-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}