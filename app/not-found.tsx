import Link from "next/link";

export default function NotFound() {
  return (
    <section className="content-card not-found">
      <span className="eyebrow">STAY NOT FOUND</span>
      <h1>We couldn’t find that sample stay.</h1>
      <p>Return to the search page and choose from the fictional dreRuss Hotels options.</p>
      <Link href="/" className="button button-primary">Start a new search</Link>
    </section>
  );
}
