// Decorative charcoal backdrop: animated grid + soft indigo glow.
export default function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-charcoal-950">
      <div className="grid-bg absolute inset-0" />
      <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[42rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
    </div>
  );
}
