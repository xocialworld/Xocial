import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50/50 to-secondary-50/50">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/50 backdrop-blur-sm border border-secondary-100/50 shadow-xl shadow-primary-900/5">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-200/50 blur-xl rounded-full animate-pulse" />
          <Spinner size="lg" className="relative text-primary-600" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-secondary-900">Xocial</h3>
          <p className="text-sm text-secondary-500 animate-pulse">Loading your workspace...</p>
        </div>
      </div>
    </div>
  );
}

