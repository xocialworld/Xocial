import { redirect } from 'next/navigation';

type ComposeRedirectProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function ComposeRedirect({ searchParams }: ComposeRedirectProps) {
  const query = new URLSearchParams();

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry) {
            query.append(key, entry);
          }
        });
      } else if (value) {
        query.set(key, value);
      }
    });
  }

  const target = query.toString() ? `/c?${query.toString()}` : '/c';

  redirect(target);
}

