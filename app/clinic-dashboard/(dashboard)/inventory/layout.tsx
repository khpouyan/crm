// app/clinic-dashboard/(dashboard)/inventory/layout.tsx
export default function InventoryLayout({
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