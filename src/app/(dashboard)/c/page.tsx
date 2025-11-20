import { UnifiedPostComposer } from "@/components/features/create/unified-post-composer";

export default async function CPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-12 pt-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Create</p>
        <h1 className="text-3xl font-bold text-secondary-900">C — Create</h1>
        <div className="mt-2 max-w-2xl text-secondary-600">
          <p>AI-powered content creation for all your social platforms.</p>
        </div>
      </div>

      <UnifiedPostComposer />
    </div>
  );
}
