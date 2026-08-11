'use client';

import React from 'react';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/context/ProgressContext';

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps>, NextLinkProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Link({ href, onClick, children, ...props }: LinkProps) {
  const router = useRouter();
  const { start } = useProgress();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const hrefStr = href.toString();
    const isExternal = hrefStr.startsWith('http') || hrefStr.startsWith('//');
    const isHash = hrefStr.startsWith('#');
    const isNewTab = props.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey;

    if (onClick) onClick(e);

    if (isExternal || isHash || isNewTab || e.defaultPrevented) {
      return;
    }

    e.preventDefault();
    start();

    router.push(hrefStr);
  };

  return (
    <NextLink href={href} onClick={handleClick} {...props}>
      {children}
    </NextLink>
  );
}
