"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/lib/store";

/**
 * Client-side Redux StoreProvider for Next.js App Router.
 * Uses useState with a lazy initializer to create the store exactly once,
 * avoiding React Compiler's ref-during-render restriction.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState<AppStore>(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
