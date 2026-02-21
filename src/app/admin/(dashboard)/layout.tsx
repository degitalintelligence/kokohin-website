import Sidebar from '@/components/admin/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-[#f4f5f7] font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                {children}
            </div>
        </div>
    )
}
