"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { cookies } from "next/headers";
import { getCurrentMembership, CURRENT_NEIGHBORHOOD_COOKIE } from "@/lib/current-neighborhood";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireActiveMembership() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current } = await getCurrentMembership(user.id);
  if (!current) redirect("/join");

  return { supabase, user, membership: current };
}

export async function submitFeedback(formData: FormData) {
  const { supabase, user, membership } = await requireActiveMembership();

  const topic = formData.get("topic") as string;
  const message = (formData.get("message") as string)?.trim();
  if (!message) return;

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    neighborhood_id: membership.neighborhood_id,
    topic,
    message,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/feedback", "page");
}

export async function respondToFeedback(formData: FormData) {
  const { supabase, user, membership } = await requireAdminMembership();
  const feedbackId = formData.get("feedback_id") as string;
  const response = (formData.get("response") as string)?.trim();

  const { data: original } = await supabase
    .from("feedback")
    .select("user_id, topic")
    .eq("id", feedbackId)
    .maybeSingle();

  const { error } = await supabase
    .from("feedback")
    .update({
      status: "reviewed",
      admin_response: response || null,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);
  if (error) throw new Error(error.message);

  if (original && response) {
    await supabase.from("notifications").insert({
      user_id: original.user_id,
      neighborhood_id: membership.neighborhood_id,
      type: "feedback_response",
      title: "Reply to your feedback",
      body: response.length > 100 ? `${response.slice(0, 100)}…` : response,
      link_url: "/feedback",
    });
  }

  revalidatePath("/admin/feedback", "page");
  revalidatePath("/feedback", "page");
}

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const { supabase, user } = await requireActiveMembership();

  const isIOS = false; // set client-side context instead, see component below

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function deletePushSubscription() {
  const { supabase, user } = await requireActiveMembership();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function recordStandaloneVisit(platform: "ios" | "android" | "other") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ last_standalone_at: new Date().toISOString(), platform })
    .eq("id", user.id);
}

export async function startAdminMemberThread(formData: FormData) {
  const { supabase, user, membership } = await requireAdminMembership();
  const memberUserId = formData.get("user_id") as string;

  const { data: existing } = await supabase
    .from("moderation_threads")
    .select("id")
    .eq("content_owner_id", memberUserId)
    .eq("initiated_by", user.id)
    .is("report_id", null)
    .maybeSingle();

  let threadId = existing?.id;

  if (!threadId) {
    const { data: newThread, error } = await supabase
      .from("moderation_threads")
      .insert({
        neighborhood_id: membership.neighborhood_id,
        content_owner_id: memberUserId,
        initiated_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    threadId = newThread.id;

    await supabase.from("notifications").insert({
      user_id: memberUserId,
      neighborhood_id: membership.neighborhood_id,
      type: "admin_message",
      title: "Message from an admin",
      body: "An admin started a conversation with you.",
      link_url: `/moderation/${threadId}`,
    });
  }

  redirect(`/moderation/${threadId}`);
}

export async function preJoinNeighborhood(userId: string, inviteCode: string) {
  try {
    const admin = createAdminClient();

    const { data: neighborhood } = await admin
      .from("neighborhoods")
      .select("id")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .maybeSingle();

    if (!neighborhood) {
      return { success: false, reason: "invalid_code" as const };
    }

    const { data: existing } = await admin
      .from("neighborhood_members")
      .select("id, neighborhood_id")
      .eq("user_id", userId);

    if (existing?.some((m) => m.neighborhood_id === neighborhood.id)) {
      return { success: true as const };
    }

    if (existing && existing.length > 0) {
      return { success: false, reason: "already_has_membership" as const };
    }

    const { error } = await admin.from("neighborhood_members").insert({
      neighborhood_id: neighborhood.id,
      user_id: userId,
      status: "active",
    });

    if (error) {
      console.error("preJoinNeighborhood insert error:", error);
      return { success: false, reason: "insert_failed" as const };
    }

    return { success: true as const };
  } catch (err) {
    console.error("preJoinNeighborhood unexpected error:", err);
    return { success: false, reason: "exception" as const };
  }
}

// --- Neighborhood Switch -------------------------------------------------------------

export async function switchNeighborhood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const neighborhoodId = formData.get("neighborhood_id") as string;

  const { data: membership } = await supabase
    .from("neighborhood_members")
    .select("neighborhood_id")
    .eq("user_id", user.id)
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) throw new Error("You're not an active member of that neighborhood");

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_NEIGHBORHOOD_COOKIE, neighborhoodId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/browse");
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

  const listingType = formData.get("listing_type") === "giveaway" ? "giveaway" : "loan";

  const { error } = await supabase.from("items").insert({
  id: itemId,
  neighborhood_id: membership.neighborhood_id,
  owner_id: user.id,
  name: formData.get("name") as string,
  description: (formData.get("description") as string) || null,
  image_url: imageUrl,
  category_id: (formData.get("category_id") as string) || null,
  listing_type: listingType,
});

if (error) throw new Error(error.message);
revalidatePath("/my-items");
revalidatePath("/browse", "page");
revalidatePath("/free", "page");
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

  const listingType = formData.get("listing_type") === "giveaway" ? "giveaway" : "loan";

  const { error } = await supabase
    .from("items")
    .update({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      image_url: imageUrl,
      category_id: (formData.get("category_id") as string) || null,
      listing_type: listingType,
    })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  revalidatePath("/my-items");
  revalidatePath("/browse", "page");
  revalidatePath("/free", "page");
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

export async function toggleItemAvailability(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;

  const { data: item } = await supabase
    .from("items")
    .select("status, owner_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!item || item.owner_id !== user.id) {
    throw new Error("Not authorized");
  }
  if (item.status !== "available" && item.status !== "unavailable") {
    throw new Error("Can't change availability while a loan is in progress");
  }

  const newStatus = item.status === "available" ? "unavailable" : "available";

  const { error } = await supabase
    .from("items")
    .update({ status: newStatus })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/my-items", "page");
  revalidatePath("/browse", "page");
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

  let update: LoanUpdate;

  if (action === "checkout") {
    const dueDate = (formData.get("due_date") as string) || null;
    update = {
      status: "checked_out",
      checked_out_at: new Date().toISOString(),
      due_date: dueDate,
    };
  } else {
    const statusMap: Record<string, LoanUpdate> = {
      approve: { status: "approved", approved_at: new Date().toISOString() },
      deny: { status: "denied" },
      return: { status: "returned", returned_at: new Date().toISOString() },
      cancel: { status: "cancelled" },
    };
    update = statusMap[action];
  }

  const { error } = await supabase.from("loans").update(update).eq("id", loanId);
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
  | "loan_message"
  | "item_request"
  | "item_request_response"
  | "free_pile"
  | "giveaway_message";
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
  
  } else if (targetType === "free_pile") {
  const { data } = await supabase
    .from("free_piles")
    .select("neighborhood_id")
    .eq("id", targetId)
    .maybeSingle();
  neighborhoodId = data?.neighborhood_id ?? null;
} else if (targetType === "giveaway_message") {
  const { data } = await supabase
    .from("giveaway_messages")
    .select("thread_id")
    .eq("id", targetId)
    .maybeSingle();
  if (data) {
    const { data: thread } = await supabase
      .from("giveaway_threads")
      .select("neighborhood_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    neighborhoodId = thread?.neighborhood_id ?? null;
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

export async function recordActivity() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", user.id);
}

export async function resolveReport(formData: FormData) {
  const { supabase, user } = await requireAdminMembership();
  const reportId = formData.get("report_id") as string;
const targetType = formData.get("target_type") as
  | "item"
  | "loan_message"
  | "item_request"
  | "item_request_response"
  | "free_pile"
  | "giveaway_message";
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
    
    }
    else if (targetType === "free_pile") {
  const { data } = await supabase
    .from("free_piles")
    .select("posted_by")
    .eq("id", targetId)
    .maybeSingle();
  contentOwnerId = data?.posted_by ?? null;
  await supabase.from("free_piles").update({ content_flag: true }).eq("id", targetId);
} else if (targetType === "giveaway_message") {
  const { data } = await supabase
    .from("giveaway_messages")
    .select("sender_id")
    .eq("id", targetId)
    .maybeSingle();
  contentOwnerId = data?.sender_id ?? null;
  await supabase.from("giveaway_messages").delete().eq("id", targetId);
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

let updateQuery = supabase.from("reports").update({
  status: action === "hide" ? "resolved" : "dismissed",
  reviewed_by: user.id,
  reviewed_at: new Date().toISOString(),
});

if (action === "hide") {
  updateQuery = updateQuery
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "open");
} else {
  updateQuery = updateQuery.eq("id", reportId);
}

const { error } = await updateQuery;
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

// --- Giving Away items ---------------------------------------------------

export async function startGiveawayThread(formData: FormData) {
  const { supabase, user, membership } = await requireActiveMembership();
  const itemId = formData.get("item_id") as string;

  const { data: item } = await supabase
    .from("items")
    .select("owner_id, name")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Item not found");
  if (item.owner_id === user.id) throw new Error("You can't request your own item");

  const { data: existing } = await supabase
    .from("giveaway_threads")
    .select("id")
    .eq("item_id", itemId)
    .eq("requester_id", user.id)
    .maybeSingle();

  let threadId = existing?.id;

  if (!threadId) {
    const { data: newThread, error } = await supabase
      .from("giveaway_threads")
      .insert({
        item_id: itemId,
        neighborhood_id: membership.neighborhood_id,
        owner_id: item.owner_id,
        requester_id: user.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    threadId = newThread.id;

    await supabase.from("giveaway_messages").insert({
      thread_id: threadId,
      sender_id: null,
      is_system: true,
      message: `Conversation started about: "${item.name}"`,
    });

    await supabase.from("notifications").insert({
      user_id: item.owner_id,
      neighborhood_id: membership.neighborhood_id,
      type: "giveaway_request",
      title: "Someone wants your item",
      body: `A neighbor is interested in "${item.name}"`,
      link_url: `/free/threads/${threadId}`,
    });
  }

  redirect(`/free/threads/${threadId}`);
}

export async function sendGiveawayMessage(formData: FormData) {
  const { supabase, user } = await requireActiveMembership();
  const threadId = formData.get("thread_id") as string;
  const message = (formData.get("message") as string)?.trim();
  if (!message) return;

  const { error } = await supabase.from("giveaway_messages").insert({
    thread_id: threadId,
    sender_id: user.id,
    message,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/free/threads/${threadId}`, "page");
}

// --- Free piles ------------------------------------------------------------

export async function createFreePile(formData: FormData) {
  const { supabase, user, membership } = await requireActiveMembership();

  const pileId = crypto.randomUUID();
  let imageUrl: string | null = null;

  const file = formData.get("image_file") as File | null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${membership.neighborhood_id}/${user.id}/pile-${pileId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    const { data: publicUrlData } = supabase.storage.from("item-images").getPublicUrl(path);
    imageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from("free_piles").insert({
    id: pileId,
    neighborhood_id: membership.neighborhood_id,
    posted_by: user.id,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    location: (formData.get("location") as string) || null,
    image_url: imageUrl,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/free", "page");
}

export async function updateFreePileStatus(formData: FormData) {
  const { supabase } = await requireActiveMembership();
  const pileId = formData.get("pile_id") as string;
  const newStatus = formData.get("new_status") as string;

  const { error } = await supabase.rpc("update_free_pile_status", {
    _pile_id: pileId,
    _new_status: newStatus,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/free", "page");
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