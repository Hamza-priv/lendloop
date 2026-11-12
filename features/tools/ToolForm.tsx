"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/shared/lib/errors";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  type Category,
  type Condition,
} from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/shared/ui/Field";
import type { ToolLocation } from "@/features/location/hooks";
import { LocationPicker } from "@/features/location/LocationPicker";
import { ImageUploader, type FormImage } from "./ImageUploader";

export type ToolFormValues = {
  name: string;
  category: Category;
  condition: Condition;
  description: string;
  location: ToolLocation | null;
  images: FormImage[];
};

/** Form values -> the shape the tools.create / tools.update mutations take. */
export function toToolInput(values: ToolFormValues) {
  return { ...values, images: values.images.map((i) => i.id) };
}

type Props = {
  initial?: ToolFormValues;
  submitLabel: string;
  onSubmit: (values: ToolFormValues) => Promise<unknown>;
  onCancel?: () => void;
  idPrefix?: string;
};

const empty: ToolFormValues = { name: "", category: "power_tools", condition: "good", description: "", location: null, images: [] };
const MAX_DESCRIPTION = 500;

/** Shared by "List a tool" and editing a listing. */
export function ToolForm({ initial = empty, submitLabel, onSubmit, onCancel, idPrefix = "tool" }: Props) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof ToolFormValues>(key: K, value: ToolFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const id = (name: string) => `${idPrefix}-${name}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Name" htmlFor={id("name")}>
        <Input
          id={id("name")}
          required
          minLength={2}
          maxLength={80}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Cordless drill"
          autoFocus
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" htmlFor={id("category")}>
          <Select id={id("category")} value={values.category} onChange={(e) => set("category", e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Condition" htmlFor={id("condition")}>
          <Select id={id("condition")} value={values.condition} onChange={(e) => set("condition", e.target.value as Condition)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Description"
        htmlFor={id("description")}
        hint={`Optional. What's included, any quirks, where to collect it. ${values.description.length}/${MAX_DESCRIPTION}`}
      >
        <Textarea
          id={id("description")}
          rows={4}
          maxLength={MAX_DESCRIPTION}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="18V drill with two batteries and a charger."
        />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-800">Photos</p>
        <ImageUploader value={values.images} onChange={(images) => set("images", images)} onBusyChange={setUploading} />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-zinc-800">Pickup location</p>
        <p className="text-xs text-zinc-500">
          Optional. Signed-in neighbours see this pin and can open directions in Google Maps. It never appears on the
          public page. A nearby corner or your gate works fine.
        </p>
        <div className="pt-1.5">
          <LocationPicker value={values.location} onChange={(location) => set("location", location)} idPrefix={idPrefix} />
        </div>
      </div>
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-5">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={busy} disabled={uploading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
