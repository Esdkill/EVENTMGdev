"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { createPortal } from "react-dom";
import { SectionLoading } from "./section-loading";

function CabinetLinkStatus({ href }: { href: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  const target = document.getElementById("cabinet-loading-slot");
  return target ? createPortal(<SectionLoading href={href} />, target) : null;
}

export function CabinetLink({ href, children, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  return <Link href={href} {...props}>
    {children}<CabinetLinkStatus href={href} />
  </Link>;
}
