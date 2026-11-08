"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleSubmit = async () => {
    if (loading || !form.name || !form.email || !form.password) return;
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters!");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      router.push("/today");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 dark:border-white/10 rounded-2xl text-base bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-rose-400 dark:focus:border-rose-500 transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-rose-950/40 flex items-center justify-center p-4 transition-colors duration-300">
      <ThemeToggle className="fixed top-4 right-4" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-xl shadow-rose-500/30 mx-auto mb-4">
            <Dumbbell size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">LiftLog</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-white/10 p-6 sm:p-8">
          <div className="space-y-4">
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name *"
                autoComplete="name"
                className={inputClass}
              />
            </div>

            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email *"
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Password (min 6) *"
                autoComplete="new-password"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Show password"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !form.name || !form.email || !form.password}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-rose-500/25"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-rose-600 dark:text-rose-400 font-bold no-underline hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}