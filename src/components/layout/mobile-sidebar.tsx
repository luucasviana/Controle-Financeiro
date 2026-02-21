import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { Sidebar } from "./sidebar"

export function MobileSidebar() {
    return (
        <Drawer>
            <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </DrawerTrigger>
            <DrawerContent className="p-0 bg-slate-900 h-full w-72">
                <Sidebar />
            </DrawerContent>
        </Drawer>
    )
}
