// app/clinic-dashboard/(dashboard)/services/layout.tsx
export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-0">
      {children}
    </div>
  );
}