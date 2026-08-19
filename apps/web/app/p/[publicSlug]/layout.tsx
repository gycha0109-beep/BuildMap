import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./layout.module.css";

export default async function PublicProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;

  return (
    <>
      {children}
      <nav className={styles.switcher} aria-label="Public project sections">
        <Link href={`/p/${publicSlug}`}>Project Map</Link>
        <Link href={`/p/${publicSlug}/feedback`}>External Feedback</Link>
      </nav>
    </>
  );
}
