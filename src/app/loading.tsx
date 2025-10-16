import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="text-center">
        <Spinner size="lg" className="text-primary-600 mb-4" />
        <p className="text-secondary-600">Loading...</p>
      </div>
    </div>
  );
}

