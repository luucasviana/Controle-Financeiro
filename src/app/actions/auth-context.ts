import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export const getCurrentUserId = cache(async (): Promise<string> => {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    return user.id
})
