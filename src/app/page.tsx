import LinkAccountButton from "@/components/link-account-button";
import React from "react";

export default function Page(): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center text-center">
      <LinkAccountButton />
    </div>
  );
}
