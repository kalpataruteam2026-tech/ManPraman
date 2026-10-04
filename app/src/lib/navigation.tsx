'use client';

import React, { forwardRef, useCallback, useEffect } from 'react';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation';

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>,
    Pick<NextLinkProps, 'replace' | 'scroll' | 'prefetch'> {
  to?: string;
  href?: string;
  children?: React.ReactNode;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, href, replace, scroll, prefetch, children, onClick, ...rest },
  ref
) {
  const destination = to || href || '#';
  return (
    <NextLink
      ref={ref}
      href={destination}
      replace={replace}
      scroll={scroll}
      prefetch={prefetch}
      onClick={onClick}
      {...rest}
    >
      {children}
    </NextLink>
  );
});

export function useNavigate() {
  const router = useRouter();

  return useCallback(
    (to: string | number, options?: { replace?: boolean }) => {
      if (typeof to === 'number') {
        if (to < 0) router.back();
        else router.forward();
      } else if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    },
    [router]
  );
}

export function useParams<T extends Record<string, string | string[] | undefined> = Record<string, string>>(): T {
  const params = useNextParams();
  return (params || {}) as T;
}

export function useLocation() {
  const pathname = usePathname() || '/';
  const searchParams = useNextSearchParams();
  const searchStr = searchParams ? searchParams.toString() : '';

  return {
    pathname,
    search: searchStr ? `?${searchStr}` : '',
    hash: '',
    state: null,
    key: pathname,
  };
}

export function useSearchParams() {
  return useNextSearchParams();
}

export function Navigate({ to, replace = true }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [to, replace, router]);

  return null;
}
