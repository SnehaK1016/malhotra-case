"use client";
import { useEffect } from "react";
import { go } from "@/lib/client";

/* The Final Verdict is part of Round 5. This old address sends the team to Round 5, where the server decides what is unlocked. */
export default function Verdict() {
  useEffect(() => { go("/case/round/5", "The last sealed file"); }, []);
  return <p className="p-10 text-graphite">Opening the last sealed file…</p>;
}
