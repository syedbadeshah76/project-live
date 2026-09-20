export default function Blobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute top-10 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute top-1/3 right-10 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
    </div>
  );
}
