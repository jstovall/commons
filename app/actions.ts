"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireActiveMembership() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("neighborhood_members")
    .select("neighborhood_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/join");
  return { supabase, user, membership };
}

// --- Items -------------------------------------------------------------

export async function createItem(formData: FormData) {
  const { supabase, user, membership } = await requireActiveMembership();

  const { error } = await supabase.from("items").insert({
    neighborhood_id: membership.neighborhood_id,
    owner_id: user.id,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    image_url: (formData.get("image_url") as string) || null,
    category_id: (formData.get("category_id") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/my-items");
  revalidatePath("/browse", "page");
}

export async function updateItem(formData: FormData) {
  const { supabase } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;

  const { error } = await supabase
    .from("items")
    .update({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      image_url: (formData.get("image_url") as string) || null,
      category_id: (formData.get("category_id") as string) || null,
    })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  revalidatePath("/my-items");
  revalidatePath("/browse", "page");
}

export async function deleteItem(formData: FormData) {
  const { supabase } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;

  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/my-items");
  revalidatePath("/browse", "page");
}

// --- Favorites -----------------------------------------------------------

export async function toggleFavorite(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;

  const { data: existing } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_id", itemId);
  } else {
    await supabase.from("favorites").insert({ user_id: user.id, item_id: itemId });
  }
  revalidatePath("/browse", "page");
}

// --- Comments -----------------------------------------------------------

export async function addComment(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;
  const comment = (formData.get("comment") as string)?.trim();
  if (!comment) return;

  const { error } = await supabase.from("comments").insert({
    item_id: itemId,
    user_id: user.id,
    comment,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/browse", "page");
}

// --- Loans -----------------------------------------------------------------

export async function requestLoan(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;
  const message = (formData.get("message") as string) || null;

  const { data: item } = await supabase
    .from("items")
    .select("owner_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Item not found");

  const { error } = await supabase.from("loans").insert({
    item_id: itemId,
    borrower_id: user.id,
    owner_id: item.owner_id,
    borrower_message: message,
  });
  if (error) throw new Error(error.message);
revalidatePath("/browse", "page");
}

export async function sendLoanMessage(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const loanId = formData.get("loan_id") as string;
  const message = (formData.get("message") as string)?.trim();
  if (!message) return;

  const { error } = await supabase.from("loan_messages").insert({
    loan_id: loanId,
    sender_id: user.id,
    message,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/loans/${loanId}`, "page");
}

export async function respondToLoan(formData: FormData) {
  const { supabase } = await requireActiveMembership();
  const loanId = formData.get("loan_id") as string;
  const action = formData.get("action") as
    | "approve"
    | "deny"
    | "checkout"
    | "return"
    | "cancel";

  const statusMap: Record<string, Record<string, unknown>> = {
    approve: { status: "approved", approved_at: new Date().toISOString() },
    deny: { status: "denied" },
    checkout: { status: "checked_out", checked_out_at: new Date().toISOString() },
    return: { status: "returned", returned_at: new Date().toISOString() },
    cancel: { status: "cancelled" },
  };

  const { error } = await supabase.from("loans").update(statusMap[action]).eq("id", loanId);
  if (error) throw new Error(error.message);
revalidatePath("/browse", "page");
  revalidatePath("/my-items");
}

// --- Item requests ("wanted" board) ----------------------------------------

export async function createItemRequest(formData: FormData) {
  const { supabase, user, membership } = await requireActiveMembership();

  const { error } = await supabase.from("item_requests").insert({
    neighborhood_id: membership.neighborhood_id,
    requester_id: user.id,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    category_id: (formData.get("category_id") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}

export async function respondToItemRequest(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const requestId = formData.get("request_id") as string;
  const message = formData.get("message") as string;
  const itemId = (formData.get("item_id") as string) || null;

  const { error } = await supabase.from("item_request_responses").insert({
    request_id: requestId,
    responder_id: user.id,
    item_id: itemId,
    message,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}

export async function updateItemRequestStatus(formData: FormData) {
  const { supabase } = await requireActiveMembership();
  const requestId = formData.get("request_id") as string;
  const status = formData.get("status") as "fulfilled" | "cancelled";

  const { error } = await supabase
    .from("item_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}