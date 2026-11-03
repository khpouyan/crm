import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { ClinicProfile } from "@/components/admin-dashboard/ClinicProfile"
import { sampleClinics } from "@/data/clinics-data"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SingleClinicPage({ params }: PageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  const matchedClinic = sampleClinics.find((c) => c.id === decodedId)

  return (
    <SidebarInset>
     

      <div className="flex flex-1 flex-col p-4 md:p-6" dir="rtl">
        <ClinicProfile
          initialData={{
            id: decodedId,
            name: matchedClinic?.centerName,
            managerName: matchedClinic?.fullName,
            registerPhone: matchedClinic?.phoneNumber,
            city: matchedClinic?.city,
          }}
        />
      </div>
    </SidebarInset>
  )
}