"use client";

import { EyeOff, Globe, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/shared/ui/Card";
import { useCreateTool } from "./hooks";
import { ToolForm, toToolInput } from "./ToolForm";

const NOTES = [
  { icon: Globe, text: "Visitors see only the name and category." },
  { icon: EyeOff, text: "Your email is never shown to other users." },
  { icon: ShieldCheck, text: "You approve or decline every request." },
];

export function NewToolForm() {
  const create = useCreateTool();
  const router = useRouter();
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <Card className="p-6 sm:p-8">
        <ToolForm
          submitLabel="Publish listing"
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            await create(toToolInput(values));
            toast.success("Listing published", { description: `${values.name} is now visible to neighbours.` });
            router.push("/listings");
          }}
        />
      </Card>
      <aside className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Good to know</h2>
        <ul className="space-y-3">
          {NOTES.map((n) => (
            <li key={n.text} className="flex gap-3 text-sm text-zinc-600">
              <n.icon className="mt-0.5 size-4 shrink-0 text-brand-700" />
              {n.text}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
