// app/clinic-dashboard/(dashboard)/inventory/page.tsx
import { redirect } from "next/navigation";

export default function InventoryIndexPage() {
  redirect("/clinic-dashboard/inventory/products");
}
