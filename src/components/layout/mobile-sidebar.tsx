"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { AppTabs } from "./app-tabs"

export function MobileSidebar() {
    return (
        <Drawer>
            <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </DrawerTrigger>
            <DrawerContent className="h-full w-72 bg-app-surface p-4">
                <AppTabs orientation="vertical" />
            </DrawerContent>
        </Drawer>
    )
}
