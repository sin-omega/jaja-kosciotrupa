"use client";

import { useEffect } from "react";
import { supabaseAnon } from "./supabase";

export function useRequireAuth() {
  useEffect(() => {
    supabaseAnon.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login";
      }
    });
  }, []);
}