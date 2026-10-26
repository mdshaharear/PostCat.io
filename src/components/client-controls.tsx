"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ProductVisual } from "@/components/product-visual";
import type { ProductImage } from "@/types/catalog";

function isolatePageFromModal(overlay: HTMLElement | null) {
  const state = [...document.body.children]
    .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
    .map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
  state.forEach(({ element }) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
  return () => state.forEach(({ element, inert, ariaHidden }) => {
    element.inert = inert;
    if (ariaHidden === null) element.removeAttribute("aria-hidden"); else element.setAttribute("aria-hidden", ariaHidden);
  });
}

export function MobileMenu({ links }: { links: readonly { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.classList.add("hydrated");
    return () => document.documentElement.classList.remove("hydrated");
  }, []);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const restoreBackground = isolatePageFromModal(dialog?.parentElement ?? null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => dialog ? [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')] : [];
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
      trigger?.focus();
    };
  }, [open]);
  return <div className="mobile-menu"><button ref={triggerRef} className="menu-trigger" aria-expanded={open} aria-haspopup="dialog" aria-label="Open navigation" onClick={() => setOpen(true)}><span aria-hidden>☰</span><span>Menu</span></button>{open && createPortal(<div className="mobile-nav-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div ref={dialogRef} className="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="Site navigation"><div className="mobile-nav-head"><strong>Explore PostCat</strong><button className="icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}>×</button></div><form className="mobile-search" role="search" aria-label="Mobile site search" action="/search"><input name="q" aria-label="Search products" placeholder="What are you looking for?" /><button>Search</button></form><nav aria-label="Mobile navigation" className="mobile-nav-links">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}><span>{link.label}</span><span aria-hidden>→</span></Link>)}</nav><p className="mobile-nav-note">347 categories · transparent demo catalog</p></div></div>, document.body)}</div>;
}

export function FilterToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const restoreBackground = isolatePageFromModal(dialog?.parentElement ?? null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => dialog ? [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')] : [];
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
      trigger?.focus();
    };
  }, [open]);
  return <div className="mobile-filter"><button ref={triggerRef} className="button button-secondary" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>Filters <span aria-hidden>↘</span></button>{open && createPortal(<div className="filter-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div ref={dialogRef} className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title"><h2 id="mobile-filter-title" className="sr-only">Product filters</h2><button className="sheet-close" onClick={() => setOpen(false)} aria-label="Close filters">×</button>{children}</div></div>, document.body)}</div>;
}

export function VariantPicker({ variants }: { variants: { id: string; label: string }[] }) { return <div className="variant-picker" aria-label="Available demo variants"><p>Available demo variants</p><div>{variants.map((variant) => <span key={variant.id}>{variant.label}</span>)}</div></div>; }
export function ProductGallery({ images }: { images: ProductImage[] }) { const [selected, setSelected] = useState(0); return <div className="gallery"><ProductVisual image={images[selected]} className="gallery-main" eager /><div className="gallery-thumbs">{images.map((image, index) => <button type="button" key={image.id} aria-label={`Show ${index === 0 ? "main" : "alternate"} demo view`} aria-pressed={selected === index} onClick={() => setSelected(index)}><ProductVisual image={image} /></button>)}</div></div>; }
export function NewsletterForm() { const [done, setDone] = useState(false); return done ? <p className="form-success" role="status">Thanks — this demo form does not store your email.</p> : <form onSubmit={(event) => { event.preventDefault(); setDone(true); }} className="newsletter-form"><label className="sr-only" htmlFor="email">Email address</label><input id="email" type="email" placeholder="you@example.com" required /><button className="button button-light" type="submit">Join the demo list</button></form>; }