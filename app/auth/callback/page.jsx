"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const storeSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        localStorage.setItem("user", JSON.stringify(session.user))
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }

    storeSession()
  }, [router])

  return <p>Processing login...</p>
}
