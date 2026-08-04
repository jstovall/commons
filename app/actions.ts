"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

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

  const itemId = crypto.randomUUID();
  let imageUrl: string | null = null;

  const file = formData.get("image_file") as File | null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${membership.neighborhood_id}/${user.id}/${itemId}.${ext}`;

    console.log("Upload debug:", {
      neighborhood_id: membership.neighborhood_id,
      user_id: user.id,
      path,
    });

    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage.from("item-images").getPublicUrl(path);
    imageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from("items").insert({
    id: itemId,
    neighborhood_id: membership.neighborhood_id,
    owner_id: user.id,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    image_url: imageUrl,
    category_id: (formData.get("category_id") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/my-items");
  revalidatePath("/browse", "page");
}

export async function updateItem(formData: FormData) {
  const { supabase, user, membership } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;

  let imageUrl = (formData.get("existing_image_url") as string) || null;

  const file = formData.get("image_file") as File | null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${membership.neighborhood_id}/${user.id}/${itemId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage.from("item-images").getPublicUrl(path);
    imageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase
    .from("items")
    .update({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      image_url: imageUrl,
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
  const { supabase, user, membership } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;
  const comment = (formData.get("comment") as string)?.trim();
  if (!comment) return;

  const { error } = await supabase.from("comments").insert({
    item_id: itemId,
    user_id: user.id,
    neighborhood_id: membership.neighborhood_id,
    comment,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/browse", "page");
}

// --- Loans -----------------------------------------------------------------

export async function requestLoan(formData: FormData) {
  const { supabase, user, membership } = await requireActiveMembership();
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
    neighborhood_id: membership.neighborhood_id,
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

  type LoanUpdate = Database["public"]["Tables"]["loans"]["Update"];

  const statusMap: Record<string, LoanUpdate> = {
    approve: { status: "approved", approved_at: new Date().toISOString() },
    deny: { status: "denied" },
    checkout: { status: "checked_out", checked_out_at: new Date().toISOString() },
    return: { status: "returned", returned_at: new Date().toISOString() },
    cancel: { status: "cancelled" },
  };

  const { error } = await supabase.from("loans").update(statusMap[action]).eq("id", loanId);
  if (error) throw new Error(error.message);
  revalidatePath("/browse", "page");
  revalidatePath("/my-items", "page");
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
  revalidatePath("/asks");
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
  revalidatePath("/asks");
}

async function requireAdminMembership() {
  const result = await requireActiveMembership();
  if (result.membership.role !== "admin" && result.membership.role !== "moderator") {
    redirect("/browse");
  }
  return result;
}

// --- Content moderation ------------------------------------------------

export async function flagContent(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const targetType = formData.get("target_type") as
    | "item"
    | "comment"
    | "loan_message"
    | "item_request"
    | "item_request_response";
  const targetId = formData.get("target_id") as string;
  const reason = (formData.get("reason") as string)?.trim();
  if (!reason) return;

  let neighborhoodId: string | null = null;

  if (targetType === "item") {
    const { data } = await supabase
      .from("items")
      .select("neighborhood_id")
      .eq("id", targetId)
      .maybeSingle();
    neighborhoodId = data?.neighborhood_id ?? null;
  } else if (targetType === "comment") {
    const { data } = await supabase
      .from("comments")
      .select("neighborhood_id")
      .eq("id", targetId)
      .maybeSingle();
    neighborhoodId = data?.neighborhood_id ?? null;
  } else if (targetType === "loan_message") {
    const { data } = await supabase
      .from("loan_messages")
      .select("loan_id")
      .eq("id", targetId)
      .maybeSingle();
    if (data) {
      const { data: loan } = await supabase
        .from("loans")
        .select("neighborhood_id")
        .eq("id", data.loan_id)
        .maybeSingle();
      neighborhoodId = loan?.neighborhood_id ?? null;
    }
  } else if (targetType === "item_request") {
    const { data } = await supabase
      .from("item_requests")
      .select("neighborhood_id")
      .eq("id", targetId)
      .maybeSingle();
    neighborhoodId = data?.neighborhood_id ?? null;
  } else if (targetType === "item_request_response") {
    const { data } = await supabase
      .from("item_request_responses")
      .select("request_id")
      .eq("id", targetId)
      .maybeSingle();
    if (data) {
      const { data: req } = await supabase
        .from("item_requests")
        .select("neighborhood_id")
        .eq("id", data.request_id)
        .maybeSingle();
      neighborhoodId = req?.neighborhood_id ?? null;
    }
  }

  if (!neighborhoodId) throw new Error("Could not determine neighborhood for report");

  const { error } = await supabase.from("reports").insert({
    neighborhood_id: neighborhoodId,
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/browse", "page");
  revalidatePath("/loans", "layout");
}

export async function resolveReport(formData: FormData) {
  const { supabase, user } = await requireAdminMembership();
  const reportId = formData.get("report_id") as string;
  const targetType = formData.get("target_type") as string;
  const targetId = formData.get("target_id") as string;
  const action = formData.get("action") as "dismiss" | "hide";

  const { data: report } = await supabase
    .from("reports")
    .select("neighborhood_id, reason")
    .eq("id", reportId)
    .maybeSingle();

  let contentOwnerId: string | null = null;

  if (action === "hide") {
    if (targetType === "item") {
      const { data } = await supabase
        .from("items")
        .select("owner_id")
        .eq("id", targetId)
        .maybeSingle();
      contentOwnerId = data?.owner_id ?? null;
      await supabase.from("items").update({ content_flag: true }).eq("id", targetId);
    } else if (targetType === "comment") {
      const { data } = await supabase
        .from("comments")
        .select("user_id")
        .eq("id", targetId)
        .maybeSingle();
      contentOwnerId = data?.user_id ?? null;
      await supabase.from("comments").update({ content_flag: true }).eq("id", targetId);
    }
    
    else if (targetType === "loan_message") {
      const { data } = await supabase
        .from("loan_messages")
        .select("sender_id")
        .eq("id", targetId)
        .maybeSingle();
      contentOwnerId = data?.sender_id ?? null;
      await supabase.from("loan_messages").delete().eq("id", targetId);
    } else if (targetType === "item_request") {
  const { data } = await supabase
    .from("item_requests")
    .select("requester_id")
    .eq("id", targetId)
    .maybeSingle();
  contentOwnerId = data?.requester_id ?? null;
  await supabase.from("item_requests").update({ content_flag: true }).eq("id", targetId);
} else if (targetType === "item_request_response") {
  const { data } = await supabase
    .from("item_request_responses")
    .select("responder_id")
    .eq("id", targetId)
    .maybeSingle();
  contentOwnerId = data?.responder_id ?? null;
  await supabase.from("item_request_responses").delete().eq("id", targetId);
}
    
  }

  const { error } = await supabase
    .from("reports")
    .update({
      status: action === "hide" ? "resolved" : "dismissed",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) throw new Error(error.message);

  if (action === "hide" && contentOwnerId && report) {
    const { data: existingThread } = await supabase
      .from("moderation_threads")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle();

    let threadId = existingThread?.id;

    if (!threadId) {
      const { data: newThread, error: threadError } = await supabase
        .from("moderation_threads")
        .insert({
          report_id: reportId,
          neighborhood_id: report.neighborhood_id,
          content_owner_id: contentOwnerId,
        })
        .select("id")
        .single();
      if (threadError) throw new Error(threadError.message);
      threadId = newThread.id;

      await supabase.from("moderation_messages").insert({
        thread_id: threadId,
        sender_id: null,
        is_system: true,
        message: `Your ${targetType.replace("_", " ")} was removed by a moderator. Reason: "${report.reason}"`,
      });

      await supabase.from("notifications").insert({
        user_id: contentOwnerId,
        neighborhood_id: report.neighborhood_id,
        type: "content_removed",
        title: "Content removed",
        body: `A moderator removed your ${targetType.replace("_", " ")}. Tap to see why or reply.`,
        link_url: `/moderation/${threadId}`,
      });
    }

    revalidatePath("/admin/reports", "page");
    redirect(`/moderation/${threadId}`);
  }

  revalidatePath("/admin/reports", "page");
}

async function requireStrictAdminMembership() {
  const result = await requireAdminMembership();
  if (result.membership.role !== "admin") {
    redirect("/admin/reports");
  }
  return result;
}

export async function sendModerationMessage(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const threadId = formData.get("thread_id") as string;
  const message = (formData.get("message") as string)?.trim();
  if (!message) return;

  const { error } = await supabase.from("moderation_messages").insert({
    thread_id: threadId,
    sender_id: user.id,
    message,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/moderation/${threadId}`, "page");
}

// --- Neighborhood admin --------------------------------------------------

export async function removeMember(formData: FormData) {
  const { supabase, membership } = await requireAdminMembership();
  const memberUserId = formData.get("user_id") as string;

  const { error } = await supabase
    .from("neighborhood_members")
    .update({ status: "removed" })
    .eq("neighborhood_id", membership.neighborhood_id)
    .eq("user_id", memberUserId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/members", "page");
}

export async function updateMemberRole(formData: FormData) {
  const { supabase, membership } = await requireStrictAdminMembership();
  const memberUserId = formData.get("user_id") as string;
  const role = formData.get("role") as "member" | "moderator" | "admin";

  const { error } = await supabase
    .from("neighborhood_members")
    .update({ role })
    .eq("neighborhood_id", membership.neighborhood_id)
    .eq("user_id", memberUserId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/members", "page");
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function regenerateInviteCode(formData: FormData) {
  const { supabase, membership } = await requireStrictAdminMembership();
  const newCode = generateInviteCode();

  const { error } = await supabase
    .from("neighborhoods")
    .update({ invite_code: newCode })
    .eq("id", membership.neighborhood_id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/members", "page");
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: formData.get("display_name") as string,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/profile", "page");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
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
  revalidatePath("/asks");
}

// --- Notifications ("notifications" board) ----------------------------------------
export async function markNotificationRead(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const notificationId = formData.get("notification_id") as string;
  const linkUrl = (formData.get("link_url") as string) || "/notifications";

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/notifications", "page");
  redirect(linkUrl);
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireActiveMembership();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications", "page");
}
// --- DM Threads ----------------------------------------

export async function startAskThread(formData: FormData) {
  const { supabase, user, membership } = await requireActiveMembership();
  const requestId = formData.get("request_id") as string;
  const responderId = formData.get("responder_id") as string;

  const { data: existing } = await supabase
    .from("ask_threads")
    .select("id")
    .eq("request_id", requestId)
    .eq("responder_id", responderId)
    .maybeSingle();

  let threadId = existing?.id;

  if (!threadId) {
    const { data: newThread, error } = await supabase
      .from("ask_threads")
      .insert({
        request_id: requestId,
        neighborhood_id: membership.neighborhood_id,
        requester_id: user.id,
        responder_id: responderId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    threadId = newThread.id;

    const { data: request } = await supabase
      .from("item_requests")
      .select("title")
      .eq("id", requestId)
      .maybeSingle();

    await supabase.from("ask_messages").insert({
      thread_id: threadId,
      sender_id: null,
      is_system: true,
      message: `Conversation started about: "${request?.title ?? "your ask"}"`,
    });

    await supabase.from("notifications").insert({
      user_id: responderId,
      neighborhood_id: membership.neighborhood_id,
      type: "ask_message",
      title: "New message about an ask",
      body: `Someone wants to chat about their ask for "${request?.title ?? ""}"`,
      link_url: `/asks/threads/${threadId}`,
    });
  }

  redirect(`/asks/threads/${threadId}`);
}

export async function sendAskMessage(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const threadId = formData.get("thread_id") as string;
  const message = (formData.get("message") as string)?.trim();
  if (!message) return;

  const { error } = await supabase.from("ask_messages").insert({
    thread_id: threadId,
    sender_id: user.id,
    message,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/asks/threads/${threadId}`, "page");
}