import { Suspense } from "react";
import { CreateWorkspace } from "./create-workspace";

export default async function CPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-12 pt-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Create</p>
        <h1 className="text-3xl font-bold text-secondary-900">C — Create</h1>
        <div className="mt-2 max-w-2xl text-secondary-600 space-y-2">
          <p>AI Content Assistant for captions, hashtags, platform variants, and strategies.</p>
          <ol className="list-decimal pl-5 text-sm">
            <li>Enter a brief and generate content</li>
            <li>Review per-platform previews and refine if needed</li>
            <li>Save as draft or send to calendar with accounts</li>
            <li>Publish immediately or schedule</li>
          </ol>
        </div>
      </div>

      <Suspense fallback={<div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">Loading AI tools...</div>}>
        <CreateWorkspace />
      </Suspense>
    </div>
  );
}
